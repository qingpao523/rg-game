extends Actor

## Enemy - 怪物基类

class_name Enemy

enum EnemyType { GRUNT, CHARGER, ELITE }

@export var enemy_type: EnemyType = EnemyType.GRUNT
@export var exp_reward: int = 3
@export var damage: float = 8.0
@export var attack_range: float = 25.0
@export var attack_cooldown: float = 1.0

var target: Player = null
var _last_attack_time: float = 0.0

func _ready() -> void:
	super._ready()
	add_to_group("enemy")
	# 查找玩家
	var players = get_tree().get_nodes_in_group("player")
	if players.size() > 0:
		target = players[0] as Player

func _die() -> void:
	if target:
		GameSession.add_experience(exp_reward)
		GameSession.add_kill()
		EventBus.emit_signal("enemy_killed", self, target)
	super._die()

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

	if dist > attack_range:
		velocity = dir.normalized() * move_speed + knockback_velocity
	else:
		velocity = knockback_velocity
		# 攻击
		if TimeService.game_time - _last_attack_time >= attack_cooldown:
			_attack()

	move_and_slide()

func _attack() -> void:
	_last_attack_time = TimeService.game_time
	target.take_damage(damage, self)
