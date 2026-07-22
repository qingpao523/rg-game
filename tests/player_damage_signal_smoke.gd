extends SceneTree

func _init() -> void:
	root.size = Vector2i(720, 1280)
	call_deferred("_run")

func _run() -> void:
	await process_frame
	var session := root.get_node_or_null("/root/GameSession")
	var app := root.get_node_or_null("/root/GameApp")
	var time_service := root.get_node_or_null("/root/TimeService")
	if not session or not app or not time_service:
		push_error("Missing core autoloads")
		quit(1)
		return
	session.start_new("taoist")
	time_service.reset()
	app.state = app.GameState.PLAYING

	var packed_scene := load("res://assets/scenes/battle/Battle.tscn") as PackedScene
	if not packed_scene:
		push_error("Failed to load Battle.tscn")
		quit(1)
		return
	var scene := packed_scene.instantiate()
	root.add_child(scene)
	for i in range(30):
		await process_frame

	var player := scene.get_node_or_null("Player")
	if not player or not player.has_method("take_damage"):
		push_error("Battle should have a damageable Player node")
		quit(1)
		return

	player.take_damage(5.0, scene)
	for i in range(20):
		await process_frame

	if absf(float(session.health) - (float(session.max_health) - 5.0)) > 0.01:
		push_error("Player damage should sync to GameSession: %.1f/%.1f" % [session.health, session.max_health])
		quit(1)
		return

	print("PLAYER_DAMAGE_SIGNAL_SMOKE_OK health=", session.health)
	quit()
