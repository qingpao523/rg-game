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
	_setup_input_map()
	_load_configs()
	state = GameState.MAIN_MENU
	print("[GameApp] 初始化完成，当前场景: ", get_tree().current_scene)

func _setup_input_map() -> void:
	if InputMap.has_action("move_up"):
		return
	InputMap.add_action("move_up")
	InputMap.add_action("move_down")
	InputMap.add_action("move_left")
	InputMap.add_action("move_right")
	InputMap.add_action("active_skill")
	InputMap.add_action("pause")

	var add_key = func(action: String, keycode: Key):
		var event = InputEventKey.new()
		event.keycode = keycode
		InputMap.action_add_event(action, event)

	add_key.call("move_up", KEY_W)
	add_key.call("move_up", KEY_UP)
	add_key.call("move_down", KEY_S)
	add_key.call("move_down", KEY_DOWN)
	add_key.call("move_left", KEY_A)
	add_key.call("move_left", KEY_LEFT)
	add_key.call("move_right", KEY_D)
	add_key.call("move_right", KEY_RIGHT)
	add_key.call("active_skill", KEY_SPACE)
	add_key.call("pause", KEY_ESCAPE)
	add_key.call("pause", KEY_P)

func _load_configs() -> void:
	CharacterConfig.load_data()
	SkillConfig.load_data()
	EvolutionConfig.load_data()
	EnemyConfig.load_data()
	WaveConfig.load_data()
	print("[GameApp] 配置加载完成")

func start_game(character_id: String) -> void:
	print("[GameApp] start_game: ", character_id)
	_clear_scene_pause()
	state = GameState.PLAYING
	GameSession.start_new(character_id)
	TimeService.reset()
	var err = get_tree().change_scene_to_file("res://assets/scenes/battle/Battle.tscn")
	print("[GameApp] change_scene_to_file: ", err)
	if err == OK:
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
	_clear_scene_pause()
	state = GameState.RESULT
	TimeService.pause()
	GameSession.survival_time = TimeService.game_time
	var session = GameSession
	emit_signal("game_over", session.wave, session.kills, session.level, session.survival_time)
	var err = get_tree().change_scene_to_file("res://assets/scenes/result/Result.tscn")
	print("[GameApp] end_game -> Result: ", err)

func return_to_menu() -> void:
	_clear_scene_pause()
	state = GameState.MAIN_MENU
	TimeService.reset()
	GameSession.reset()
	var err = get_tree().change_scene_to_file("res://assets/scenes/main_menu/MainMenu.tscn")
	print("[GameApp] return_to_menu: ", err)

func _clear_scene_pause() -> void:
	get_tree().paused = false

func _notification(what: int) -> void:
	if what == NOTIFICATION_WM_WINDOW_FOCUS_OUT:
		if state == GameState.PLAYING:
			pause_game()
