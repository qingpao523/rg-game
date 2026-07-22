extends Actor

## Enemy - 怪物基类
## 支持近战/远程、移动动画、朝向翻转

class_name Enemy

enum EnemyType { GRUNT, CHARGER, ELITE, RANGER }

@export var enemy_type: EnemyType = EnemyType.GRUNT
@export var exp_reward: int = 3
@export var damage: float = 8.0
@export var attack_range: float = 0.0
@export var attack_cooldown: float = 0.0

var target: Player = null
var _enemy_type_str: String = "grunt"
var _is_ranged: bool = false
var _projectile_speed: float = 300.0
var _projectile_tex: String = ""
var _attack_timer: float = 0.0
var _anim_timer: float = 0.0
var _on_move_frame: bool = false
var _idle_tex = null
var _move_tex = null
var _visual_animator: Node = null

func set_sprite_by_type(type_str: String) -> void:
	_enemy_type_str = type_str
	var cfg = EnemyConfig.get_config(type_str)
	_is_ranged = cfg.get("is_ranged", false)
	_projectile_speed = cfg.get("projectile_speed", 300.0)
	_projectile_tex = cfg.get("projectile_texture", "")
	# 加载 idle 和 move 两帧贴图
	var sprite = $Sprite as Sprite2D
	if not sprite:
		return
	sprite.position = Vector2.ZERO
	sprite.rotation = 0.0
	sprite.modulate = Color.WHITE
	var art_key: String = cfg.get("art_key", type_str)
	_idle_tex = load("res://assets/art/enemies/%s_idle.tres" % art_key)
	_move_tex = load("res://assets/art/enemies/%s_move.tres" % art_key)
	if _idle_tex:
		sprite.texture = _idle_tex
	var visual_scale: float = cfg.get("visual_scale", 0.052)
	sprite.scale = Vector2(visual_scale, visual_scale)
	_bind_visual_animator()

func _ready() -> void:
	super._ready()
	add_to_group("enemy")
	_visual_animator = get_node_or_null("VisualAnimator")
	_bind_visual_animator()
	var contact = $ContactDamage
	if contact:
		contact.body_entered.connect(_on_contact_body_entered)
	var players = get_tree().get_nodes_in_group("player")
	if players.size() > 0:
		target = players[0] as Player

func reset_for_spawn(player_node: Node = null) -> void:
	alive = true
	visible = true
	set_process(true)
	set_physics_process(true)
	target = player_node as Player
	_attack_timer = 0.0
	_anim_timer = 0.0
	_on_move_frame = false
	velocity = Vector2.ZERO
	knockback_velocity = Vector2.ZERO
	_bind_visual_animator()

func _bind_visual_animator() -> void:
	if not _visual_animator:
		_visual_animator = get_node_or_null("VisualAnimator")
	if _visual_animator and _visual_animator.has_method("bind_sprite"):
		_visual_animator.bind_sprite($Sprite)

func _on_contact_body_entered(body: Node) -> void:
	if body.is_in_group("player") and body.has_method("take_damage"):
		body.take_damage(damage, self)

func take_damage(amount: float, source: Node = null) -> void:
	if _visual_animator and _visual_animator.has_method("play_hit_flash"):
		_visual_animator.play_hit_flash()
	super.take_damage(amount, source)

func _die() -> void:
	if target:
		GameSession.add_experience(exp_reward)
		GameSession.add_kill()
		EventBus.emit_signal("enemy_killed", self, target)
	_spawn_death_ghost()
	# 使用对象池回收，不 queue_free
	alive = false
	visible = false
	set_process(false)
	set_physics_process(false)
	ObjectPool.release_node("enemies", self)

func _spawn_death_ghost() -> void:
	var sprite := $Sprite as Sprite2D
	if not sprite or not sprite.texture:
		return
	var ghost := Sprite2D.new()
	ghost.texture = sprite.texture
	ghost.centered = sprite.centered
	ghost.modulate = sprite.modulate
	ghost.z_index = z_index + 1
	_get_spawn_parent().add_child(ghost)
	ghost.global_position = sprite.global_position
	ghost.global_rotation = sprite.global_rotation
	ghost.global_scale = sprite.global_scale
	var target_scale := ghost.scale * 0.72
	var tween := ghost.create_tween().set_parallel(true)
	tween.set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_OUT)
	tween.tween_property(ghost, "modulate:a", 0.0, 0.28)
	tween.tween_property(ghost, "scale", target_scale, 0.28)
	tween.chain().tween_callback(ghost.queue_free)

func _physics_process(delta: float) -> void:
	super._physics_process(delta)
	if not alive or not target:
		move_and_slide()
		return
	if GameApp.state != GameApp.GameState.PLAYING:
		move_and_slide()
		return

	var dir = (target.global_position - global_position)
	var dist = dir.length()

	if _is_ranged:
		# 远程怪：保持距离射击
		if dist > attack_range * 0.6:
			velocity = dir.normalized() * move_speed + knockback_velocity
		else:
			velocity = knockback_velocity
		# 远程攻击
		_attack_timer += delta
		if _attack_timer >= attack_cooldown and dist <= attack_range * 1.5:
			_attack_timer = 0.0
			_fire_projectile(dir.normalized())
	else:
		# 近战怪：追踪目标
		if dist > 20.0:
			velocity = dir.normalized() * move_speed + knockback_velocity
		else:
			velocity = knockback_velocity

	move_and_slide()

	# 朝向：朝目标方向翻转
	var sprite = $Sprite as Sprite2D
	if sprite and velocity.length_squared() > 1.0:
		var sx: float = abs(sprite.scale.x)
		sprite.scale.x = -sx if velocity.x < 0 else sx

	# 移动/站立动画帧切换
	_anim_timer += delta
	if _anim_timer > 0.3:
		_anim_timer = 0.0
		if sprite:
			var is_moving: bool = velocity.length_squared() > 10.0
			if is_moving:
				_on_move_frame = not _on_move_frame
				sprite.texture = _move_tex if _on_move_frame and _move_tex else _idle_tex
			else:
				_on_move_frame = false
				if sprite.texture != _idle_tex and _idle_tex:
					sprite.texture = _idle_tex
	if _visual_animator and _visual_animator.has_method("set_motion_velocity"):
		_visual_animator.set_motion_velocity(velocity)

func _fire_projectile(direction: Vector2) -> void:
	var proj = preload("res://assets/prefabs/projectile.tscn").instantiate()
	proj.global_position = global_position
	proj.direction = direction
	proj.speed = _projectile_speed
	proj.damage = damage
	proj.pierce = false
	proj.set_from_enemy(true)
	if _projectile_tex != "":
		proj.set_texture(_projectile_tex)
	_get_spawn_parent().add_child(proj)

func _get_spawn_parent() -> Node:
	if get_tree().current_scene:
		return get_tree().current_scene
	if get_parent():
		return get_parent()
	return get_tree().root
