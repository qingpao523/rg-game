extends Area2D

## CollisionComponent - 碰撞组件
## 挂载到所有实体上，通过 CollisionGrid 进行空间查询

class_name CollisionComponent

enum Type { PLAYER, ENEMY, PROJECTILE, PICKUP, WALL }

@export var collision_type: Type = Type.ENEMY
@export var collision_radius: float = 12.0
@export var damage_on_contact: float = 0.0
@export var knockback_force: float = 0.0

var active: bool = true

func _ready() -> void:
	var shape = CollisionShape2D.new()
	var circle = CircleShape2D.new()
	circle.radius = collision_radius
	shape.shape = circle
	add_child(shape)

func set_active(a: bool) -> void:
	active = a
	set_deferred("monitoring", a)
	set_deferred("monitorable", a)

func _get_configuration_warnings() -> PackedStringArray:
	var warnings: PackedStringArray = []
	if collision_radius <= 0:
		warnings.append("碰撞半径必须大于 0")
	return warnings
