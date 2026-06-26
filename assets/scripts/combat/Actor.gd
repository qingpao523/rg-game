extends CharacterBody2D

## Actor - 战斗实体基类
## 玩家、敌人都基于物理碰撞体

class_name Actor

@export var max_hp: float = 100.0
@export var move_speed: float = 200.0

var hp: float
var alive: bool = true
var knockback_velocity: Vector2 = Vector2.ZERO

func _ready() -> void:
	hp = max_hp

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

func _physics_process(delta: float) -> void:
	if not alive:
		return
	# 击退衰减
	knockback_velocity = knockback_velocity.move_toward(Vector2.ZERO, delta * 500.0)
