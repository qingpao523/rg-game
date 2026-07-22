extends Area2D

## EffectAura - 光环效果（雷云等）
## 跟随玩家，自动对范围内的敌人造成伤害

var _skill_name: String = ""
var _damage: float = 0.0
var _interval: float = 1.5
var _range: float = 250.0
var _owner: Node = null
var _skill_instance = null
var _timer: float = 0.0

func setup(name_tag: String, dmg: float, interval: float, rng: float, owner_node: Node, inst) -> void:
	_skill_name = name_tag
	_damage = dmg
	_interval = interval
	_range = rng
	_owner = owner_node
	_skill_instance = inst
	# 调整视觉大小
	for child in get_children():
		if child is CollisionShape2D:
			var shape = RectangleShape2D.new()
			shape.size = Vector2(_range * 2, _range * 2)
			child.shape = shape
		if child is ColorRect:
			child.size = Vector2(_range * 2, _range * 2)
			child.position = Vector2(-_range, -_range)
	var sprite := $Sprite as Sprite2D
	if sprite:
		_apply_visual_scale(sprite)

func _process(delta: float) -> void:
	if not _owner or not is_instance_valid(_owner):
		queue_free()
		return
	# 跟随玩家
	global_position = _owner.global_position
	# 自动攻击
	_timer += delta
	if _timer >= _interval:
		_timer = 0.0
		_attack()

func _attack() -> void:
	var enemies = get_tree().get_nodes_in_group("enemy")
	var nearest: Node2D = null
	var min_dist = INF
	for e in enemies:
		var d = global_position.distance_squared_to(e.global_position)
		if d < min_dist and d <= _range * _range:
			min_dist = d
			nearest = e
	if nearest and nearest.has_method("take_damage"):
		nearest.take_damage(_damage)
		print("[Aura] ", _skill_name, " 攻击: ", _damage)

func _apply_visual_scale(sprite: Sprite2D) -> void:
	var tex := sprite.texture
	if not tex:
		return
	var max_dim: float = max(float(tex.get_width()), float(tex.get_height()))
	if max_dim <= 0.0:
		return
	var target_size: float = clampf(_range * 0.8, 150.0, 220.0)
	sprite.scale = Vector2.ONE * (target_size / max_dim)
	sprite.z_index = 35
