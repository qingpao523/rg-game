extends CanvasLayer

## HudView - 游戏内 HUD

class_name HudView

@onready var hp_bar: ProgressBar = $Control/VBox/HPBar
@onready var hp_bar_label: Label = $Control/VBox/HPBar/Label
@onready var mana_bar: ProgressBar = $Control/VBox/ManaBar
@onready var mana_bar_label: Label = $Control/VBox/ManaBar/Label
@onready var level_label: Label = $Control/VBox/LevelLabel
@onready var time_label: Label = $Control/VBox/TimeLabel
@onready var wave_label: Label = $Control/VBox/WaveLabel
@onready var skill_container: HBoxContainer = $Control/VBox/SkillContainer
@onready var pause_button: Button = $Control/VBox/PauseButton

func _ready() -> void:
	EventBus.player_damaged.connect(_on_player_damaged)
	EventBus.player_healed.connect(_on_player_healed)
	EventBus.player_leveled_up.connect(_on_leveled_up)
	EventBus.wave_changed.connect(_on_wave_changed)
	pause_button.pressed.connect(_on_pause_pressed)

func _process(_delta: float) -> void:
	if not is_instance_valid(GameSession):
		return
	if GameSession.max_health > 0:
		hp_bar.value = GameSession.health / GameSession.max_health * 100.0
	if GameSession.max_mana > 0:
		mana_bar.value = GameSession.mana / GameSession.max_mana * 100.0
	time_label.text = TimeService.get_elapsed_formatted()
	hp_bar_label.text = "%d/%d" % [GameSession.health, GameSession.max_health]
	mana_bar_label.text = "%d/%d" % [GameSession.mana, GameSession.max_mana]

func _on_player_damaged(amount: int, _source: Node) -> void:
	modulate = Color(1, 0.8, 0.8)
	await get_tree().create_timer(0.1).timeout
	modulate = Color.WHITE

func _on_player_healed(amount: int) -> void:
	pass

func _on_leveled_up(new_level: int) -> void:
	level_label.text = "Lv.%d" % new_level

func _on_wave_changed(wave: int) -> void:
	wave_label.text = "第 %d 波" % wave

func _on_pause_pressed() -> void:
	GameApp.pause_game()
