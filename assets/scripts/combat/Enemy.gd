extends Actor

## Enemy - 怪物基类

class_name Enemy

enum EnemyType { GRUNT, CHARGER, ELITE }

@export var enemy_type: EnemyType = EnemyType.GRUNT
@export var exp_reward: int = 3
@export var damage: float = 8.0
@export var attack_range: float = 20.0
@export var attack_cooldown: float = 1.0

var target: Node2D = null
var _last_attack_time: float = 0.0
var _charger: bool = false
var _charge_cooldown: float = 3.0
var _last_charge_time: float = 0.0

func _ready() -> void:
	super._ready()
	# 寻找玩家
	var players = get_tree().get_nodes_in_group("player")
	if players.size() > 0:
		target = players[0] as Node2D

func _get_collision_type() -> int:
	return CollisionComponent.Type.ENEMY

func _die() -> void:
	# 掉经验
	if target and target is Player:
		GameSession.add_experience(exp_reward)
		GameSession.add_kill()
		EventBus.emit_signal("enemy_killed", self, target)
	super._die()

func _process(delta: float) -> void:
	if not alive or not target:
		return
	super._process(delta)   # 处理击退
	var dir = (target.global_position - global_position)
	var dist = dir.length()
	if dist > attack_range:
		# 追踪
		velocity = dir.normalized() * move_speed
	else:
		velocity = Vector2.ZERO
		# 攻击
		if TimeService.game_time - _last_attack_time >= attack_cooldown:
			_attack()

func _attack() -> void:
	_last_attack_time = TimeService.game_time
	if target and target is Player:
		target.take_damage(damage)
