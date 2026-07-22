extends Node2D

## SwarmManager - 数据驱动的怪物群管理器
## 同屏 1000+ 怪物，零 Node 开销，单 Draw Call 渲染
## 替代传统的 CharacterBody2D + Sprite2D 方案

class_name SwarmManager

const MAX_ENEMIES = 1000
const PLAYER_HITBOX_RADIUS_SQ = 400.0

# 数据数组：紧凑的 Packed 数组，CPU 缓存友好
var active_count: int = 0
var enemy_positions := PackedVector2Array()
var enemy_hps := PackedFloat32Array()
var enemy_hp_max := PackedFloat32Array()
var enemy_speeds := PackedFloat32Array()
var enemy_damages := PackedFloat32Array()
var enemy_exp := PackedInt32Array()
var enemy_types := PackedInt32Array()  # 0=grunt, 1=charger, 2=elite, 3=ranged
var enemy_timers := PackedFloat32Array()  # 攻击间隔计时

@onready var multi_mesh_instance = $MultiMeshInstance2D
var multi_mesh: MultiMesh
var enemy_texture: Texture2D = null

var player_ref: Node2D = null

func _ready() -> void:
	enemy_positions.resize(MAX_ENEMIES)
	enemy_hps.resize(MAX_ENEMIES)
	enemy_hp_max.resize(MAX_ENEMIES)
	enemy_speeds.resize(MAX_ENEMIES)
	enemy_damages.resize(MAX_ENEMIES)
	enemy_exp.resize(MAX_ENEMIES)
	enemy_types.resize(MAX_ENEMIES)
	enemy_timers.resize(MAX_ENEMIES)

	multi_mesh = MultiMesh.new()
	multi_mesh.transform_format = MultiMesh.TRANSFORM_2D
	multi_mesh.instance_count = MAX_ENEMIES
	multi_mesh.visible_instance_count = 0
	multi_mesh_instance.multimesh = multi_mesh

func spawn(pos: Vector2, hp: float, speed: float, damage: float, exp: int, etype: int) -> bool:
	if active_count >= MAX_ENEMIES:
		return false
	var i = active_count
	enemy_positions[i] = pos
	enemy_hps[i] = hp
	enemy_hp_max[i] = hp
	enemy_speeds[i] = speed
	enemy_damages[i] = damage
	enemy_exp[i] = exp
	enemy_types[i] = etype
	enemy_timers[i] = 0.0
	active_count += 1
	return true

func _process(delta: float) -> void:
	if not player_ref or not is_instance_valid(player_ref):
		return
	var pp = player_ref.global_position
	var i = 0
	while i < active_count:
		var dir = (pp - enemy_positions[i]).normalized()
		var dist_sq = enemy_positions[i].distance_squared_to(pp)
		# 碰撞检测
		if dist_sq < PLAYER_HITBOX_RADIUS_SQ:
			# 接触伤害
			if player_ref.has_method("take_damage"):
				player_ref.take_damage(enemy_damages[i], self)
			_kill_at(i)
			continue
		# 移动
		enemy_positions[i] += dir * enemy_speeds[i] * delta
		# 同步 MultiMesh 变换
		var t = Transform2D(0, enemy_positions[i])
		multi_mesh.set_instance_transform_2d(i, t)
		i += 1
	multi_mesh.visible_instance_count = active_count

func _kill_at(index: int) -> void:
	# O(1) 删除：用最后一个元素覆盖当前
	var last = active_count - 1
	if index < last:
		enemy_positions[index] = enemy_positions[last]
		enemy_hps[index] = enemy_hps[last]
		enemy_hp_max[index] = enemy_hp_max[last]
		enemy_speeds[index] = enemy_speeds[last]
		enemy_damages[index] = enemy_damages[last]
		enemy_exp[index] = enemy_exp[last]
		enemy_types[index] = enemy_types[last]
		enemy_timers[index] = enemy_timers[last]
	active_count -= 1

func damage_at(index: int, amount: float) -> bool:
	if index >= active_count:
		return false
	enemy_hps[index] -= amount
	if enemy_hps[index] <= 0:
		# 给经验
		if player_ref:
			GameSession.add_experience(enemy_exp[index])
			GameSession.add_kill()
		_kill_at(index)
		return true
	return false

func take_damage_any(pos: Vector2, radius: float, amount: float) -> int:
	# 范围伤害：对 radius 内所有怪物造成伤害，返回击杀数
	var kills = 0
	var r2 = radius * radius
	var i = 0
	while i < active_count:
		if enemy_positions[i].distance_squared_to(pos) < r2:
			enemy_hps[i] -= amount
			if enemy_hps[i] <= 0:
				if player_ref:
					GameSession.add_experience(enemy_exp[i])
					GameSession.add_kill()
				_kill_at(i)
				kills += 1
				continue
		i += 1
	return kills

func clear_all() -> void:
	active_count = 0
	multi_mesh.visible_instance_count = 0

func get_enemy_count() -> int:
	return active_count
