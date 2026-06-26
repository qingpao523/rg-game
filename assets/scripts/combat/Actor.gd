extends Node2D

## Actor - 战斗实体基类
## 玩家、敌人都继承自此类

class_name Actor

@export var max_hp: float = 100.0
@export var move_speed: float = 200.0

var hp: float
var alive: bool = true
var velocity: Vector2 = Vector2.ZERO
var knockback_velocity: Vector2 = Vector2.ZERO

# 引用组件
var collision_comp: CollisionComponent
var _sprite: Sprite2D
var _hp_bar: Node

func _ready() -> void:
	hp = max_hp
	_setup_collision()
	_setup_visuals()

func _setup_collision() -> void:
	collision_comp = CollisionComponent.new()
	collision_comp.collision_type = _get_collision_type()
	add_child(collision_comp)

func _setup_visuals() -> void:
	pass   # 子类实现

func _get_collision_type() -> int:
	return CollisionComponent.Type.ENEMY

func take_damage(amount: float, source: Node = null) -> void:
	if not alive:
		return
	hp -= amount
	if hp <= 0:
		hp = 0
		_die()

func apply_knockback(direction: Vector2, force: float) -> void:
	knockback_velocity = direction.normalized() * force

func _die() -> void:
	alive = false
	queue_free()

func _process(delta: float) -> void:
	if not alive:
		return
	# 衰减击退
	if knockback_velocity.length_squared() > 0:
		position += knockback_velocity * delta
		knockback_velocity = knockback_velocity.move_toward(Vector2.ZERO, delta * 500)
