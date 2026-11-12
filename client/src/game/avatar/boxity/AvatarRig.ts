import { Bone, Group, Matrix4, Mesh, Quaternion, Vector3, type Object3D, type SkinnedMesh } from "three";
import { clone as cloneSkinned } from "three/examples/jsm/utils/SkeletonUtils.js";
import type { Look, LookKey } from "@shared";
import { AVATAR_ASSETS as A } from "../../../config/lobby";
import { avatarBase, loadItem, materialFor, skinTextureUrl } from "./avatarAssets";
import { applyEmote, getEmote } from "./emotes";
import { animateRig, applySwing, boneAxes, walkFrequency, type BoneAxes } from "./rigAnimation";

/** Where each item slot attaches (docs/SDK.md > AVATAR). */
const NECK_SLOTS: LookKey[] = ["hat", "hair", "mask"];
const BODY_SLOTS: { key: LookKey; bone: string; origin: [number, number, number]; dir: string }[] = [
  { key: "neck", bone: "Spine2", origin: [0, 4.8, 0], dir: "neck" },
  { key: "chest", bone: "Spine2", origin: [0, 3.6, 0], dir: "chest" },
  { key: "waist", bone: "Spine1", origin: [0, 2.4, 0], dir: "waist" },
  { key: "back", bone: "Spine2", origin: [0, 4.2, 0], dir: "back" },
];

/** Hand transform for a held tool (bone-local to ArmR2), computed once per template. */
const heldCache = new WeakMap<Group, Matrix4>();
function heldToolMatrix(template: Group, rest: Map<string, Matrix4>): Matrix4 {
  let m = heldCache.get(template);
  if (m) return m;
  const inv = rest.get("ArmR2") ?? new Matrix4();
  const leaf = rest.get("ArmR2_leaf")?.clone().invert() ?? new Matrix4();
  const hand = new Vector3().setFromMatrixPosition(leaf);
  // Model space (rig faces +Z): blade forward and a little up, edge down.
  const a = Math.sin(A.heldToolRaise);
  const b = Math.cos(A.heldToolRaise);
  const basis = new Matrix4().makeBasis(new Vector3(-1, 0, 0), new Vector3(0, a, b), new Vector3(0, b, -a));
  basis.setPosition(hand);
  basis.scale(new Vector3().setScalar((A.rigHeight / A.height) * A.heldToolScale));
  m = inv.clone().multiply(basis);
  heldCache.set(template, m);
  return m;
}

/** Model-space rest inverses per bone, computed once per template. */
const restCache = new WeakMap<Group, Map<string, Matrix4>>();
function restInverses(template: Group): Map<string, Matrix4> {
  let m = restCache.get(template);
  if (!m) {
    const map = new Map<string, Matrix4>();
    template.updateMatrixWorld(true);
    template.traverse((o) => {
      if ((o as Bone).isBone) map.set(o.name, o.matrixWorld.clone().invert());
    });
    restCache.set(template, map);
    m = map;
  }
  return m;
}

/**
 * One Boxity avatar: a SkeletonUtils clone of the merged player.glb, the
 * player's skin texture, and hat/hair/mask + neck/chest/waist/back items.
 * Hands/shoes, body parts, proportions and custom characters: next step.
 */
export class AvatarRig {
  readonly root = new Group();
  readonly bones = new Map<string, Bone>();
  readonly bind = new Map<Bone, Quaternion>();
  /** restInverse per bone, captured at rest in model space (for accessories). */
  private restInverse: Map<string, Matrix4>;
  private body: SkinnedMesh;
  private model: Group;
  private axes: Map<string, BoneAxes>;
  private items: Mesh[] = [];
  private lookKey = "";
  private token = 0;
  emote: { id: string; start: number } | null = null;
  /** Walk cycle (integrated each pose so speeding up never makes the legs jump). */
  private walkPhase = 0;
  private lastPoseAt = 0;
  private held: Object3D | null = null;
  /** Key of the held tool ("" = none). */
  heldKey = "";
  private template: Group;

  constructor(template: Group) {
    const model = cloneSkinned(template) as Group;
    model.scale.setScalar(A.height / A.rigHeight);
    model.rotation.y = Math.PI; // rig faces +Z; our forward is -Z
    this.root.add(model);
    let body: SkinnedMesh | null = null;
    model.traverse((o: Object3D) => {
      if ((o as Bone).isBone) {
        this.bones.set(o.name, o as Bone);
        this.bind.set(o as Bone, o.quaternion.clone());
      }
      if ((o as SkinnedMesh).isSkinnedMesh) body = o as SkinnedMesh;
    });
    this.body = body!;
    this.model = model;
    this.template = template;
    this.restInverse = restInverses(template);
    this.axes = boneAxes(template);
  }

  /** Apply a look (no-op if unchanged). Loads are async; stale results are dropped. */
  setLook(look: Look, skinUrlOverride?: string) {
    const key = JSON.stringify(look) + (skinUrlOverride ?? "");
    if (key === this.lookKey) return;
    this.lookKey = key;
    const token = ++this.token;
    for (const m of this.items) m.removeFromParent();
    this.items = [];

    void materialFor(skinUrlOverride ?? skinTextureUrl(look), false)
      .catch(() => materialFor(`${avatarBase()}/skins/0.png`, false))
      .then((mat) => {
        if (token === this.token) this.body.material = mat;
      });

    const base = avatarBase();
    for (const slot of NECK_SLOTS) {
      const id = look[slot];
      if (id) this.attach(token, `${base}/items/hats/${id}.obj`, `${base}/textures/hats/${id}.png`, "Neck1", new Matrix4().makeTranslation(0, 0.8, 0));
    }
    for (const s of BODY_SLOTS) {
      const id = look[s.key];
      const inv = this.restInverse.get(s.bone);
      if (!id || !inv) continue;
      const local = inv.clone().multiply(new Matrix4().makeTranslation(...s.origin));
      this.attach(token, `${base}/items/${s.dir}/${id}.obj`, `${base}/textures/${s.dir}/${id}.png`, s.bone, local);
    }
  }

  private attach(token: number, objUrl: string, texUrl: string, boneName: string, local: Matrix4) {
    const bone = this.bones.get(boneName);
    if (!bone) return;
    void Promise.all([loadItem(objUrl), materialFor(texUrl, true).catch(() => null)]).then(([geo, mat]) => {
      if (token !== this.token || !geo || !mat) return;
      const mesh = new Mesh(geo, mat);
      mesh.matrixAutoUpdate = false;
      mesh.matrix.copy(local);
      mesh.frustumCulled = false;
      bone.add(mesh);
      this.items.push(mesh);
    });
  }

  /** Put a tool in the right hand (null = empty hand). */
  setHeldTool(key: string, obj: Object3D | null) {
    if (key === this.heldKey) return;
    this.heldKey = key;
    this.held?.removeFromParent();
    this.held = obj;
    const bone = this.bones.get("ArmR2");
    if (!obj || !bone) return;
    obj.matrixAutoUpdate = false;
    obj.matrix.copy(heldToolMatrix(this.template, this.restInverse));
    obj.traverse((o) => (o.frustumCulled = false));
    bone.add(obj);
  }

  /** Show/hide items (distance LOD); the body always stays. */
  setDetail(on: boolean) {
    for (const m of this.items) m.visible = on;
  }

  /** Pose for this frame: bind pose, then the active emote or idle/walk/jump animation. */
  pose(x: number, y: number, z: number, yaw: number, speed: number, grounded: boolean, now: number, swingU = -1) {
    this.root.position.set(x, y, z);
    this.root.rotation.y = yaw;
    for (const [bone, q] of this.bind) bone.quaternion.copy(q);
    if (this.emote && (speed > 0.5 || !grounded)) this.emote = null; // emotes stop when the player moves
    const clip = this.emote ? getEmote(this.emote.id) : undefined;
    if (this.emote && clip) {
      this.model.position.y = 0;
      if (!applyEmote(clip, now - this.emote.start, this.bones, this.bind)) this.emote = null;
      return;
    }
    // Integrate the walk cycle (frequency follows speed) so it never jumps.
    const dt = this.lastPoseAt > 0 ? Math.min(0.1, Math.max(0, now - this.lastPoseAt)) : 0;
    this.lastPoseAt = now;
    this.walkPhase = (this.walkPhase + dt * walkFrequency(speed)) % (Math.PI * 200);
    animateRig(this.bones, this.axes, this.model, now, speed, grounded, this.walkPhase);
    if (swingU >= 0 && swingU <= 1) applySwing(this.bones, this.axes, swingU);
  }

  dispose() {
    this.token++;
    this.lookKey = ""; // a re-mounted rig must re-apply its look
    this.root.removeFromParent();
    // Geometries/materials are shared caches (kept for re-use); the cloned body geometry is shared too.
  }
}
