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

	paused = true
	app.start_game("taoist")
	for i in range(20):
		await process_frame

	if paused:
		push_error("start_game should always clear SceneTree.paused before entering Battle")
		quit(1)
		return
	if current_scene == null or current_scene.scene_file_path != "res://assets/scenes/battle/Battle.tscn":
		push_error("start_game should switch to Battle.tscn, got: %s" % [current_scene])
		quit(1)
		return
	if app.state != app.GameState.PLAYING:
		push_error("start_game should leave GameApp in PLAYING state")
		quit(1)
		return

	print("START_GAME_FLOW_SMOKE_OK scene=", current_scene.scene_file_path)
	quit()
