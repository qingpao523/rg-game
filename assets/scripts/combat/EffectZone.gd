extends Area2D

## EffectZone - 区域效果（火墙、麻痹领域等）
## 在固定位置持续一段时间，对进入的敌人造成效果
## 支持动画效果：火墙（闪烁）、麻痹领域（脉冲）

var _lifetime: float = 4.0
var _damage: float = 0.0
var _slow: float = 0.0
var _stun_chance: float = 0.0
var _tick_timer: float = 0.0
var _active: bool = true
var _anim_timer: float = 0.0
var _is_fire: bool = false
var _range: float = 60.0

func setup(name_tag: String, dmg: float, duration: float, rng: float, slow: float, stun: float) -> void:
	_damage = dmg
	_lifetime = duration
	_slow = slow
	_stun_chance = stun
	_range = rng
	_is_fire = (name_tag.find("火") != -1 or name_tag.find("fire") != -1)
	# 设置碰撞形状大小
	for child in get_children():
		if child is CollisionShape2D:
			var shape = RectangleShape2D.new()
			var sz = _range * 2
			if _is_fire:
				sz = _range * 2  # 火墙是矩形
			shape.size = Vector2(sz, sz * 0.4 if _is_fire else sz)
			child.shape = shape
	var sprite := $Sprite as Sprite2D
	if sprite:
		_apply_visual_scale(sprite)
	# 定时自毁
	get_tree().create_timer(_lifetime).timeout.connect(_die)

func _ready() -> void:
	body_entered.connect(_on_body_entered)

func _process(delta: float) -> void:
	if not _active:
		return
	# 动画效果
	_anim_timer += delta
	if _is_fire:
		# 火墙：闪烁+跳动
		var sprite = $Sprite as Sprite2D
		if sprite:
			var flicker = 0.7 + sin(_anim_timer * 15.0) * 0.3
			sprite.modulate = Color(1, 0.6 + sin(_anim_timer * 10.0) * 0.3, 0.2, flicker)
	# 持续伤害tick
	_tick_timer += delta
	if _tick_timer >= 0.5:
		_tick_timer = 0.0
		_do_tick_damage()

func _do_tick_damage() -> void:
	for body in get_overlapping_bodies():
		if body.is_in_group("enemy") and body.has_method("take_damage"):
			body.take_damage(_damage * 0.5)  # 一半的伤害作为 tick

func _on_body_entered(body: Node) -> void:
	if body.is_in_group("enemy") and body.has_method("take_damage"):
		body.take_damage(_damage)

func _die() -> void:
	_active = false
	queue_free()

func _apply_visual_scale(sprite: Sprite2D) -> void:
	var tex := sprite.texture
	if not tex:
		return
	var target_size := Vector2(_range * 2.0, _range * 2.0)
	if _is_fire:
		target_size = Vector2(_range * 2.2, _range * 0.55)
	var tex_size := Vector2(float(tex.get_width()), float(tex.get_height()))
	if tex_size.x <= 0.0 or tex_size.y <= 0.0:
		return
	sprite.scale = Vector2(target_size.x / tex_size.x, target_size.y / tex_size.y)
	sprite.z_index = 40
