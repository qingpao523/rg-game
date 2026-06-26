extends Node

## GameApp - 游戏主控制器
## 负责初始化、配置加载、场景切换和游戏生命周期管理

signal game_started(character_id: String)
signal game_over(wave: int, kills: int, level: int, survival_time: float)
signal scene_changed(scene_path: String)

enum GameState { BOOT, MAIN_MENU, PLAYING, PAUSED, RESULT }

var state: GameState = GameState.BOOT:
	set(value):
		state = value
		EventBus.emit_signal("game_state_changed", value)

func _ready() -> void:
	_load_configs()
	# 延迟一帧再跳转，确保场景树就绪
	call_deferred("_switch_scene", "res://assets/scenes/main_menu/MainMenu.tscn")

func _load_configs() -> void:
	CharacterConfig.load_data()
	SkillConfig.load_data()
	EvolutionConfig.load_data()
	EnemyConfig.load_data()
	WaveConfig.load_data()
	print("[GameApp] 配置加载完成")

func start_game(character_id: String) -> void:
	state = GameState.PLAYING
	GameSession.start_new(character_id)
	TimeService.reset()
	_switch_scene("res://assets/scenes/battle/Battle.tscn")
	emit_signal("game_started", character_id)

func pause_game() -> void:
	if state == GameState.PLAYING:
		state = GameState.PAUSED
		TimeService.pause()
		get_tree().paused = true

func resume_game() -> void:
	if state == GameState.PAUSED:
		state = GameState.PLAYING
		TimeService.resume()
		get_tree().paused = false

func end_game() -> void:
	state = GameState.RESULT
	TimeService.pause()
	var session = GameSession
	emit_signal("game_over", session.wave, session.kills, session.level, session.survival_time)
	_switch_scene("res://assets/scenes/result/Result.tscn")

func return_to_menu() -> void:
	state = GameState.MAIN_MENU
	TimeService.reset()
	GameSession.reset()
	_switch_scene("res://assets/scenes/main_menu/MainMenu.tscn")

func _switch_scene(scene_path: String) -> void:
	get_tree().change_scene_to_file(scene_path)
	emit_signal("scene_changed", scene_path)

func _notification(what: int) -> void:
	if what == NOTIFICATION_WM_WINDOW_FOCUS_OUT:
		if state == GameState.PLAYING:
			pause_game()
