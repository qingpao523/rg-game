extends GPUParticles2D

## HitEffect - 命中闪烁特效
## 自动播放后自销毁

func _ready() -> void:
	emitting = true
	await get_tree().create_timer(lifetime + 0.1).timeout
	queue_free()
