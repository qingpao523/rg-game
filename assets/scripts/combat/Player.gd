extends Actor

## Player - 玩家角色

class_name Player

@export var mana_max: float = 50.0
@export var mana_regen: float = 2.0
@export var active_skill_id: String = "magic_missile"

var mana_current: float
var invincible_until: float = 0.0
var invincible_duration: float = 0.5
var shield_hp: float = 0.0

func _ready() -> void:
	super._ready()
	mana_current = mana_max
	add_to_group("player")

	# 从 GameSession 同步属性
	if GameSession.character_id != "":
		max_hp = GameSession.max_health
		hp = GameSession.health
		move_speed = GameSession.move_speed_bonus
		mana_max = GameSession.max_mana
		mana_current = GameSession.mana
		active_skill_id = GameSession.active_skill_id

func take_damage(amount: float, source: Node = null) -> void:
	if TimeService.game_time < invincible_until:
		return
	if shield_hp > 0:
		var absorbed = min(shield_hp, amount)
		shield_hp -= absorbed
		amount -= absorbed
		if amount <= 0:
			return
	super.take_damage(amount, source)
	invincible_until = TimeService.game_time + invincible_duration
	# 更新 GameSession
	GameSession.health = hp

func _die() -> void:
	alive = false
	# 场景切换会自动清理，不需要 queue_free
	GameApp.end_game()

func _physics_process(delta: float) -> void:
	super._physics_process(delta)

	if not alive:
		move_and_slide()
		return
	if GameApp.state != GameApp.GameState.PLAYING:
		move_and_slide()
		return

	# 输入移动
	var input_dir = Vector2(
		Input.get_axis("move_left", "move_right"),
		Input.get_axis("move_up", "move_down")
	).normalized()

	velocity = input_dir * move_speed + knockback_velocity
	move_and_slide()

func _process(delta: float) -> void:
	if not alive:
		return
	if GameApp.state != GameApp.GameState.PLAYING:
		return
	mana_current = min(mana_max, mana_current + mana_regen * delta)
	GameSession.mana = mana_current
