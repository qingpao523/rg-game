extends SceneTree

func _init() -> void:
	root.size = Vector2i(720, 1280)
	call_deferred("_run")

func _run() -> void:
	await process_frame
	var session := root.get_node_or_null("/root/GameSession")
	if session and session.has_method("start_new"):
		session.start_new("taoist")

	var packed_scene := load("res://assets/scenes/battle/Battle.tscn") as PackedScene
	if not packed_scene:
		push_error("Failed to load Battle.tscn")
		quit(1)
		return
	var scene := packed_scene.instantiate()
	root.add_child(scene)
	for i in range(8):
		await process_frame

	var player := scene.get_node_or_null("Player")
	if not player:
		push_error("Battle scene missing Player")
		quit(1)
		return
	var sprite := player.get_node_or_null("Sprite") as Sprite2D
	var animator := player.get_node_or_null("VisualAnimator")
	if not sprite or not animator:
		push_error("Player missing Sprite or VisualAnimator")
		quit(1)
		return

	animator.set_motion_velocity(Vector2(140, 0))
	var start_position := sprite.position
	var start_rotation := sprite.rotation
	for i in range(10):
		await process_frame
	if sprite.position == start_position and is_equal_approx(sprite.rotation, start_rotation):
		push_error("Battle Player visual animation did not move the sprite")
		quit(1)
		return

	if player.has_method("play_cast_visual"):
		var before_scale := sprite.scale
		var before_modulate := sprite.modulate
		player.play_cast_visual()
		for i in range(4):
			await process_frame
		if sprite.scale == before_scale and sprite.modulate == before_modulate:
			push_error("Battle Player cast visual did not alter sprite")
			quit(1)
			return
	else:
		push_error("Player missing play_cast_visual")
		quit(1)
		return

	print("BATTLE_VISUAL_ANIMATION_SMOKE_OK")
	quit()
