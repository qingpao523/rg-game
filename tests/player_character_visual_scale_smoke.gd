extends SceneTree

const CASES := ["taoist", "pharaoh", "ice_witch", "samurai", "crusader"]
const MIN_VISUAL_HEIGHT := 132.0
const MAX_VISUAL_HEIGHT := 158.0

func _init() -> void:
	root.size = Vector2i(720, 1280)
	call_deferred("_run")

func _run() -> void:
	await process_frame
	var session := root.get_node_or_null("/root/GameSession")
	if not session:
		push_error("Missing GameSession autoload")
		quit(1)
		return
	var packed_scene := load("res://assets/prefabs/player.tscn") as PackedScene
	if not packed_scene:
		push_error("Failed to load player prefab")
		quit(1)
		return

	for character_id in CASES:
		session.start_new(character_id)
		var player := packed_scene.instantiate()
		root.add_child(player)
		await process_frame
		var sprite := player.get_node_or_null("Sprite") as Sprite2D
		if not sprite or not sprite.texture:
			push_error("Player missing sprite texture for %s" % character_id)
			quit(1)
			return
		if not sprite.texture.resource_path.ends_with("%s_idle.tres" % character_id):
			push_error("Player should use %s art, got %s" % [character_id, sprite.texture.resource_path])
			quit(1)
			return
		var visual_height := sprite.texture.get_size().y * absf(sprite.scale.y)
		if visual_height < MIN_VISUAL_HEIGHT or visual_height > MAX_VISUAL_HEIGHT:
			push_error("Player visual height out of range for %s: %.1f texture=%s scale=%s" % [character_id, visual_height, sprite.texture.get_size(), sprite.scale])
			quit(1)
			return
		player.queue_free()
		await process_frame

	print("PLAYER_CHARACTER_VISUAL_SCALE_SMOKE_OK cases=", CASES.size())
	quit()
