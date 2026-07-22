extends SceneTree

const PREFABS := [
	"res://assets/prefabs/player.tscn",
	"res://assets/prefabs/enemy.tscn",
	"res://assets/prefabs/skeleton.tscn",
	"res://assets/prefabs/skeleton_archer.tscn",
]

func _init() -> void:
	call_deferred("_run")

func _run() -> void:
	for scene_path in PREFABS:
		var packed_scene := load(scene_path) as PackedScene
		if not packed_scene:
			push_error("Failed to load animated prefab: %s" % scene_path)
			quit(1)
			return
		var instance := packed_scene.instantiate()
		root.add_child(instance)
		await process_frame
		var animator := instance.get_node_or_null("VisualAnimator")
		if not animator:
			push_error("Missing VisualAnimator in %s" % scene_path)
			quit(1)
			return
		for method_name in ["bind_sprite", "set_motion_velocity", "play_hit_flash"]:
			if not animator.has_method(method_name):
				push_error("%s VisualAnimator missing method %s" % [scene_path, method_name])
				quit(1)
				return
		var sprite := instance.get_node_or_null("Sprite")
		if not sprite:
			push_error("Missing Sprite in %s" % scene_path)
			quit(1)
			return
		animator.set_motion_velocity(Vector2(80, 0))
		for i in range(3):
			await process_frame
		instance.queue_free()
		await process_frame
	print("ANIMATED_PREFABS_SMOKE_OK")
	quit()
