extends SceneTree

func _init() -> void:
	call_deferred("_run")

func _run() -> void:
	var script := load("res://assets/scripts/visual/VisualAnimator.gd") as Script
	if not script:
		push_error("VisualAnimator script should exist")
		quit(1)
		return

	var host := CharacterBody2D.new()
	var sprite := Sprite2D.new()
	sprite.name = "Sprite"
	host.add_child(sprite)
	root.add_child(host)

	var animator := script.new() as Node
	host.add_child(animator)

	var required_methods := [
		"bind_sprite",
		"set_motion_velocity",
		"play_cast_pulse",
		"play_hit_flash",
		"play_death",
	]
	for method_name in required_methods:
		if not animator.has_method(method_name):
			push_error("VisualAnimator missing method: %s" % method_name)
			quit(1)
			return

	animator.bind_sprite(sprite)
	animator.set_motion_velocity(Vector2(120, 0))
	for i in range(10):
		await process_frame
	if is_equal_approx(sprite.position.y, 0.0) and is_equal_approx(sprite.rotation, 0.0):
		push_error("Move animation should alter sprite position or rotation")
		quit(1)
		return

	animator.set_motion_velocity(Vector2.ZERO)
	animator.play_cast_pulse()
	for i in range(4):
		await process_frame
	if sprite.modulate == Color.WHITE and sprite.scale == Vector2.ONE:
		push_error("Cast pulse should affect sprite modulation or scale")
		quit(1)
		return

	animator.play_hit_flash()
	for i in range(2):
		await process_frame
	if sprite.modulate == Color.WHITE:
		push_error("Hit flash should alter sprite modulation")
		quit(1)
		return

	animator.play_death()
	for i in range(20):
		await process_frame
	if sprite.modulate.a >= 1.0:
		push_error("Death animation should fade sprite alpha")
		quit(1)
		return

	print("VISUAL_ANIMATOR_SMOKE_OK")
	quit()
