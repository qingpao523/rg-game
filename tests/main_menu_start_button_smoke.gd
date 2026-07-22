extends SceneTree

func _init() -> void:
	root.size = Vector2i(720, 1280)
	call_deferred("_run")

func _run() -> void:
	await process_frame
	var app := root.get_node_or_null("/root/GameApp")
	if not app:
		push_error("Missing GameApp autoload")
		quit(1)
		return

	var packed_scene := load("res://assets/scenes/main_menu/MainMenu.tscn") as PackedScene
	if not packed_scene:
		push_error("Failed to load MainMenu.tscn")
		quit(1)
		return
	var menu := packed_scene.instantiate()
	root.add_child(menu)
	await process_frame

	var start_button := menu.get_node_or_null("Panel/StartButton") as Button
	if not start_button:
		push_error("MainMenu missing StartButton")
		quit(1)
		return
	if start_button.disabled:
		push_error("StartButton should be enabled after default taoist selection")
		quit(1)
		return

	start_button.pressed.emit()
	for i in range(30):
		await process_frame

	if current_scene == null or current_scene.scene_file_path != "res://assets/scenes/battle/Battle.tscn":
		push_error("StartButton should enter Battle.tscn, got: %s" % [current_scene])
		quit(1)
		return
	if app.state != app.GameState.PLAYING:
		push_error("StartButton should leave GameApp in PLAYING state")
		quit(1)
		return

	print("MAIN_MENU_START_BUTTON_SMOKE_OK scene=", current_scene.scene_file_path)
	quit()
