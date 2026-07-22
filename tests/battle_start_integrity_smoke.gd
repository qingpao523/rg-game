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
	for i in range(180):
		await process_frame

	var player := scene.get_node_or_null("Player")
	if not player:
		push_error("Battle start should have a Player node")
		quit(1)
		return
	var player_sprite := player.get_node_or_null("Sprite") as Sprite2D
	if not player_sprite or not player_sprite.texture:
		push_error("Player should have a visible sprite texture")
		quit(1)
		return
	if not player_sprite.texture.resource_path.ends_with("taoist_idle.tres"):
		push_error("Player should use taoist art at taoist start, got: %s" % player_sprite.texture.resource_path)
		quit(1)
		return
	var player_visual_height := player_sprite.texture.get_size().y * absf(player_sprite.scale.y)
	if player_visual_height < 132.0 or player_visual_height > 158.0:
		push_error("Player visual height out of expected mobile range: %.1f texture=%s scale=%s" % [player_visual_height, player_sprite.texture.get_size(), player_sprite.scale])
		quit(1)
		return
	if session.health < session.max_health:
		push_error("Player took damage during opening safety window: %.1f/%.1f" % [session.health, session.max_health])
		quit(1)
		return

	var active_enemies: Array[Node] = []
	for node in get_nodes_in_group("enemy"):
		if node.visible and bool(node.get("alive")):
			active_enemies.append(node)
	if active_enemies.is_empty():
		push_error("Opening wave should spawn at least one visible active enemy")
		quit(1)
		return

	for enemy in active_enemies:
		var sprite := enemy.get_node_or_null("Sprite") as Sprite2D
		if not sprite or not sprite.texture:
			push_error("Active enemy missing sprite texture: %s" % enemy.get_path())
			quit(1)
			return
		if enemy.get("target") != player:
			push_error("Active enemy should target the Player after pool acquire: %s target=%s" % [enemy.get_path(), enemy.get("target")])
			quit(1)
			return

	print("BATTLE_START_INTEGRITY_OK active_enemies=", active_enemies.size(), " health=", session.health)
	quit()
