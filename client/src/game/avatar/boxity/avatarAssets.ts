import {
  BufferGeometry,
  CanvasTexture,
  type Group,
  MeshLambertMaterial,
  NearestFilter,
  SRGBColorSpace,
  SkinnedMesh,
  Texture,
  TextureLoader,
  type Object3D,
} from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { isRealId, type Look } from "@shared";
import { getBloxityEnv } from "../../../platform/env";
import { AVATAR_ASSETS } from "../../../config/lobby";

/** Avatar CDN base: {staticUrl}/avatars (docs/SDK.md > Asset CDN). */
export const avatarBase = () => `${getBloxityEnv().staticUrl}/avatars`;

/**
 * Body texture URL for a look. With a face, shirt or pants the API composes
 * them onto the skin; otherwise the plain skin PNG.
 */
export function skinTextureUrl(look: Look): string {
  const skin = isRealId(look.skin) ? look.skin : "0";
  // Same rule as the SDK: "0" (like "-1") means no overlay is worn.
  const worn = (id?: string) => isRealId(id) && id !== "0";
  if (!worn(look.face) && !worn(look.shirt) && !worn(look.pants)) return `${avatarBase()}/skins/${skin}.png`;
  let seg = `s${skin}`;
  if (worn(look.pants)) seg += `_pn${look.pants}`;
  if (worn(look.shirt)) seg += `_sh${look.shirt}`;
  if (worn(look.face)) seg += `_fc${look.face}`;
  return `${getBloxityEnv().apiUrl}/v1/avatar/skin-texture/${seg}.png`;
}

let templatePromise: Promise<Group> | null = null;

/**
 * player.glb (26 KB, 22 bones). Its 6 body-part meshes share one skeleton and
 * material, so they are merged into ONE SkinnedMesh: 1 draw call per avatar.
 */
export function loadTemplate(): Promise<Group> {
  templatePromise ??= new GLTFLoader().loadAsync(`${avatarBase()}/player.glb`).then((gltf) => {
    const root = gltf.scene;
    const parts: SkinnedMesh[] = [];
    root.traverse((o) => {
      if ((o as SkinnedMesh).isSkinnedMesh) parts.push(o as SkinnedMesh);
    });
    if (!parts.length) throw new Error("player.glb has no skinned meshes");
    const geometry = mergeGeometries(parts.map((p) => p.geometry), false);
    if (!geometry) throw new Error("could not merge player.glb parts");
    const body = new SkinnedMesh(geometry, new MeshLambertMaterial());
    body.name = "body";
    body.frustumCulled = false;
    const host = parts[0].parent as Object3D;
    host.add(body);
    body.bind(parts[0].skeleton, parts[0].bindMatrix);
    for (const p of parts) {
      p.removeFromParent();
      p.geometry.dispose();
    }
    return root;
  });
  return templatePromise;
}

const textures = new Map<string, Promise<Texture>>();
const materials = new Map<string, Promise<MeshLambertMaterial>>();
const objs = new Map<string, Promise<BufferGeometry | null>>();

/** Pixel-art texture, downscaled to the texture budget if the source is larger. */
function loadTexture(url: string, maxSize: number, flipY: boolean): Promise<Texture> {
  const key = `${url}|${flipY}`;
  let p = textures.get(key);
  if (!p) {
    p = new TextureLoader().loadAsync(url).then((tex) => {
      const img = tex.image as HTMLImageElement;
      let out: Texture = tex;
      if (img.width > maxSize || img.height > maxSize) {
        const k = maxSize / Math.max(img.width, img.height);
        const c = document.createElement("canvas");
        c.width = Math.max(1, Math.round(img.width * k));
        c.height = Math.max(1, Math.round(img.height * k));
        c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
        tex.dispose();
        out = new CanvasTexture(c);
      }
      out.colorSpace = SRGBColorSpace;
      out.magFilter = NearestFilter;
      out.minFilter = NearestFilter;
      out.generateMipmaps = false;
      // glTF UVs (player.glb) need flipY=false; OBJ items use the default (true).
      out.flipY = flipY;
      out.needsUpdate = true;
      return out;
    });
    textures.set(key, p);
  }
  return p;
}

/** Shared material per texture URL (players with the same skin share a material). */
export function materialFor(url: string, flipY: boolean, maxSize = AVATAR_ASSETS.maxTexture): Promise<MeshLambertMaterial> {
  const key = `${url}|${flipY}`;
  let p = materials.get(key);
  if (!p) {
    p = loadTexture(url, maxSize, flipY).then((map) => new MeshLambertMaterial({ map }));
    materials.set(key, p);
  }
  return p;
}

/** An item mesh (.obj) merged into one geometry; null when missing/broken. */
export function loadItem(url: string): Promise<BufferGeometry | null> {
  let p = objs.get(url);
  if (!p) {
    p = new OBJLoader()
      .loadAsync(url)
      .then((group) => {
        const geos: BufferGeometry[] = [];
        group.traverse((o) => {
          const g = (o as { geometry?: BufferGeometry }).geometry;
          if (g) geos.push(g.index ? g.toNonIndexed() : g);
        });
        return geos.length ? mergeGeometries(geos, false) : null;
      })
      .catch(() => null);
    objs.set(url, p);
  }
  return p;
}
