extends CharacterBody2D

## SkeletonMinion - 召唤骷髅基类
## 近战骷髅：移速快，攻击范围近
## 远程骷髅（骷髅射手）：has attack_range

var hp: float = 30.0
var max_hp: float = 30.0
var attack_damage: float = 6.0
var move_speed: float = 100.0
var attack_cooldown: float = 1.2
var attack_range: float = 25.0
var _target: Node2D = null
var _last_attack: float = 0.0
var _lifetime: float = 15.0
var _alive: bool = true
var _hp_bar: ProgressBar = null
var _is_ranged: bool = false
var _visual_animator: Node = null

func set_minion_stats(hp_val: float, atk: float) -> void:
	max_hp = hp_val
	hp = hp_val
	attack_damage = atk

func set_owner_id(_id: String) -> void:
	pass

func _ready() -> void:
	add_to_group("minion")
	z_index = 80
	_apply_visual_scale()
	_visual_animator = get_node_or_null("VisualAnimator")
	_bind_visual_animator()
	_is_ranged = (attack_range > 100)
	# 创建血条
	_hp_bar = ProgressBar.new()
	_hp_bar.custom_minimum_size = Vector2(30, 4)
	_hp_bar.size = Vector2(30, 4)
	_hp_bar.position = Vector2(-15, -20)
	_hp_bar.max_value = max_hp
	_hp_bar.value = hp
	_hp_bar.show_percentage = false
	_hp_bar.mouse_filter = Control.MOUSE_FILTER_IGNORE
	# 血条颜色（绿色 → 黄色 → 红色）
	var bg = StyleBoxFlat.new()
	bg.bg_color = Color(0.2, 0.2, 0.2, 0.6)
	_hp_bar.add_theme_stylebox_override("background", bg)
	var fill = StyleBoxFlat.new()
	fill.bg_color = Color(0.2, 0.8, 0.2, 1.0)
	_hp_bar.add_theme_stylebox_override("fill", fill)
	add_child(_hp_bar)
	# 定时消失
	get_tree().create_timer(_lifetime).timeout.connect(_die)

func _bind_visual_animator() -> void:
	if not _visual_animator:
		_visual_animator = get_node_or_null("VisualAnimator")
	if _visual_animator and _visual_animator.has_method("bind_sprite"):
		_visual_animator.bind_sprite($Sprite)

func take_damage(amount: float, _source: Node = null) -> void:
	if _visual_animator and _visual_animator.has_method("play_hit_flash"):
		_visual_animator.play_hit_flash()
	hp -= amount
	if _hp_bar:
		_hp_bar.value = max(0, hp)
		# 血条变色：绿→黄→红
		var ratio = hp / max_hp
		if ratio > 0.6:
			_hp_bar.add_theme_stylebox_override("fill", _make_bar_color(0.2, 0.8, 0.2))
		elif ratio > 0.3:
			_hp_bar.add_theme_stylebox_override("fill", _make_bar_color(0.9, 0.8, 0.2))
		else:
			_hp_bar.add_theme_stylebox_override("fill", _make_bar_color(0.9, 0.2, 0.2))
	if hp <= 0:
		_die()

func _make_bar_color(r: float, g: float, b: float) -> StyleBoxFlat:
	var s = StyleBoxFlat.new()
	s.bg_color = Color(r, g, b, 1.0)
	return s

func _apply_visual_scale() -> void:
	var sprite := $Sprite as Sprite2D
	if not sprite or not sprite.texture:
		return
	var max_dim: float = max(float(sprite.texture.get_width()), float(sprite.texture.get_height()))
	if max_dim <= 0.0:
		return
	sprite.scale = Vector2.ONE * (34.0 / max_dim)
	sprite.z_index = 2
	_bind_visual_animator()

func _die() -> void:
	if not _alive:
		return
	_alive = false
	# 骷髅死亡触发尸爆信号
	EventBus.emit_signal("enemy_killed", self, null)
	if _visual_animator and _visual_animator.has_method("play_death"):
		_visual_animator.play_death(0.28)
		if is_inside_tree():
			await get_tree().create_timer(0.22).timeout
	queue_free()

func _process(delta: float) -> void:
	if not _alive:
		return
	# 寻找最近敌人
	var min_dist = INF
	var nearest: Node2D = null
	for e in get_tree().get_nodes_in_group("enemy"):
		if not is_instance_valid(e):
			continue
		var d = global_position.distance_squared_to(e.global_position)
		if d < min_dist:
			min_dist = d
			nearest = e
	_target = nearest

func _physics_process(delta: float) -> void:
	if not _alive:
		move_and_slide()
		return
	if not _target:
		move_and_slide()
		return
	var dir = (_target.global_position - global_position)
	var dist = dir.length()
	if dist > attack_range:
		velocity = dir.normalized() * (move_speed * (0.7 if _is_ranged else 1.0))
	else:
		velocity = Vector2.ZERO
		if TimeService.game_time - _last_attack >= attack_cooldown:
			_last_attack = TimeService.game_time
			if _target.has_method("take_damage"):
				_target.take_damage(attack_damage)
	move_and_slide()
	var sprite := $Sprite as Sprite2D
	if sprite and velocity.length_squared() > 1.0:
		var sx: float = abs(sprite.scale.x)
		sprite.scale.x = -sx if velocity.x < 0 else sx
	if _visual_animator and _visual_animator.has_method("set_motion_velocity"):
		_visual_animator.set_motion_velocity(velocity)
