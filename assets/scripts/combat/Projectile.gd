extends Area2D

## Projectile - 弹幕/投射物
## 支持方向朝向、敌我弹幕

class_name Projectile

@export var speed: float = 400.0
@export var damage: int = 10
@export var direction: Vector2 = Vector2.RIGHT
@export var pierce: bool = false
@export var lifetime: float = 3.0

var _hit_enemies: Array[Node] = []
var _from_enemy: bool = false
var _texture_path: String = ""

func set_texture(tex_path: String) -> void:
	_texture_path = tex_path
	var tex := load(tex_path) as Texture2D
	var sprite := $Sprite as Sprite2D
	if tex and sprite:
		sprite.texture = tex
		_apply_visual_scale(sprite, tex_path)

func set_from_enemy(val: bool) -> void:
	_from_enemy = val

func _ready() -> void:
	body_entered.connect(_on_hit)
	var sprite := $Sprite as Sprite2D
	if sprite and sprite.texture:
		_apply_visual_scale(sprite, _texture_path)

func _physics_process(delta: float) -> void:
	position += direction * speed * delta
	# 弹头朝向移动方向
	if direction.length_squared() > 0:
		$Sprite.rotation = direction.angle()

func _apply_visual_scale(sprite: Sprite2D, tex_path: String) -> void:
	var tex := sprite.texture
	if not tex:
		return
	var max_dim: float = max(float(tex.get_width()), float(tex.get_height()))
	if max_dim <= 0.0:
		return
	var target_size: float = _get_target_visual_size(tex_path)
	var scale_value: float = target_size / max_dim
	sprite.scale = Vector2(scale_value, scale_value)
	sprite.z_index = 90

func _get_target_visual_size(tex_path: String) -> float:
	if tex_path.ends_with("thunder_bolt.tres"):
		return 92.0
	if tex_path.ends_with("chain_lightning.tres"):
		return 96.0
	if tex_path.ends_with("burn_curse.tres"):
		return 38.0
	if tex_path.ends_with("fireball.tres"):
		return 34.0
	if tex_path.ends_with("magic_missile.tres"):
		return 28.0
	return 32.0

func _on_hit(hit: Node) -> void:
	if _from_enemy:
		if hit.is_in_group("player") and hit.has_method("take_damage"):
			hit.take_damage(damage, self)
			_die()
		return
	if hit.is_in_group("enemy") and hit.has_method("take_damage"):
		if hit in _hit_enemies:
			return
		_hit_enemies.append(hit)
		hit.take_damage(damage)
		_spawn_hit_effect(hit.global_position)
		if not pierce:
			_die()

func _spawn_hit_effect(pos: Vector2) -> void:
	var p = GPUParticles2D.new()
	p.one_shot = true
	p.emitting = false
	p.lifetime = 0.3
	p.amount = 6
	p.explosiveness = 1.0
	p.local_coords = true
	p.global_position = pos
	_get_spawn_parent().add_child(p)
	p.emitting = true
	var tween = get_tree().create_timer(0.5)
	tween.timeout.connect(func():
		if is_instance_valid(p):
			p.queue_free()
	)

func _die() -> void:
	queue_free()

func _get_spawn_parent() -> Node:
	if get_tree().current_scene:
		return get_tree().current_scene
	if get_parent():
		return get_parent()
	return get_tree().root
