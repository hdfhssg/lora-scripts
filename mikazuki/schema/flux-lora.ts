Schema.intersect([
    Schema.object({
        model_train_type: Schema.string().default("flux-lora").disabled().description("训练种类"),
        pretrained_model_name_or_path: Schema.string().role('filepicker', { type: "model-file" }).default("./sd-models/model.safetensors").description("Flux 模型路径"),
        ae: Schema.string().role('filepicker', { type: "model-file" }).description("AE 模型文件路径"),
        clip_l: Schema.string().role('filepicker', { type: "model-file" }).description("clip_l 模型文件路径"),
        t5xxl: Schema.string().role('filepicker', { type: "model-file" }).description("t5xxl 模型文件路径"),
        resume: Schema.string().role('filepicker', { type: "folder" }).description("从某个 `save_state` 保存的中断状态继续训练，填写文件路径"),
    }).description("训练用模型"),

    Schema.object({
        timestep_sampling: Schema.union(["sigma", "uniform", "sigmoid", "shift"]).default("sigmoid").description("时间步采样"),
        sigmoid_scale: Schema.number().step(0.001).default(1.0).description("sigmoid 缩放"),
        model_prediction_type: Schema.union(["raw", "additive", "sigma_scaled"]).default("raw").description("模型预测类型"),
        discrete_flow_shift: Schema.number().step(0.001).default(1.0).description("Euler 调度器离散流位移"),
        loss_type: Schema.union(["l1", "l2", "huber", "smooth_l1"]).default("l2").description("损失函数类型"),
        guidance_scale: Schema.number().step(0.01).default(1.0).description("CFG 引导缩放"),
        t5xxl_max_token_length: Schema.number().step(1).description("T5XXL 最大 token 长度（不填写使用自动）"),
        train_t5xxl: Schema.boolean().default(false).description("训练 T5XXL（不推荐）"),
    }).description("Flux 专用参数"),

    Schema.object(
        UpdateSchema(SHARED_SCHEMAS.RAW.DATASET_SETTINGS, {
            resolution: Schema.string().default("768,768").description("训练图片分辨率，宽x高。支持非正方形，但必须是 64 倍数。"),
            enable_bucket: Schema.boolean().default(true).description("启用 arb 桶以允许非固定宽高比的图片"),
            min_bucket_reso: Schema.number().default(256).description("arb 桶最小分辨率"),
            max_bucket_reso: Schema.number().default(2048).description("arb 桶最大分辨率"),
            bucket_reso_steps: Schema.number().default(64).description("arb 桶分辨率划分单位，FLUX 需大于 64"),
        })
    ).description("数据集设置"),

    // 保存设置
    SHARED_SCHEMAS.SAVE_SETTINGS,

    Schema.object({
        max_train_epochs: Schema.number().min(1).default(20).description("最大训练 epoch（轮数）"),
        train_batch_size: Schema.number().min(1).default(1).description("批量大小, 越高显存占用越高"),
        gradient_checkpointing: Schema.boolean().default(true).description("梯度检查点"),
        gradient_accumulation_steps: Schema.number().min(1).default(1).description("梯度累加步数"),
        network_train_unet_only: Schema.boolean().default(true).description("仅训练 U-Net"),
        network_train_text_encoder_only: Schema.boolean().default(false).description("仅训练文本编码器"),
    }).description("训练相关参数"),

    // 学习率&优化器设置
    SHARED_SCHEMAS.LR_OPTIMIZER,

    Schema.intersect([
        Schema.object({
            network_module: Schema.union(["networks.lora_flux", "networks.oft_flux", "lycoris.kohya"]).default("networks.lora_flux").description("训练网络模块"),
            network_weights: Schema.string().role('filepicker').description("从已有的 LoRA 模型上继续训练，填写路径"),
            network_dim: Schema.number().min(1).default(2).description("网络维度，常用 4~128，不是越大越好, 低dim可以降低显存占用"),
            network_alpha: Schema.number().min(1).default(16).description("常用值：等于 network_dim 或 network_dim*1/2 或 1。使用较小的 alpha 需要提升学习率"),
            network_dropout: Schema.number().step(0.01).default(0).description('dropout 概率 （与 lycoris 不兼容，需要用 lycoris 自带的）'),
            scale_weight_norms: Schema.number().step(0.01).min(0).description("最大范数正则化。如果使用，推荐为 1"),
            network_args_custom: Schema.array(String).role('table').description('自定义 network_args，一行一个'),
            enable_base_weight: Schema.boolean().default(false).description('启用基础权重（差异炼丹）'),
            network_scale: Schema.number().step(0.05).default(1.0).description('网络缩放系数,应该小于等于1.0'),
        }).description("网络设置"),

        // lycoris 参数
        SHARED_SCHEMAS.LYCORIS_MAIN,
        SHARED_SCHEMAS.LYCORIS_LOKR,

        SHARED_SCHEMAS.NETWORK_OPTION_BASEWEIGHT,
    ]),
    Schema.intersect([
      // 对比学习主开关
      Schema.object({
        enable_contrastive: Schema.boolean()
          .default(false)
          .description('启用对比学习模块'),
      }).description('对比学习配置'),
    
      // 当 enable_contrastive = true 时，才展示下面这些配置；否则只用空对象
      Schema.union([
        Schema.object({
          enable_contrastive: Schema.const(true).required(),
    
          negative_sampling_method: Schema.union([
            'Random-Noise', 'Permutation', 'Random-index', 'Circular', 'Hard-Negative',
          ])
            .default('Random-Noise')
            .description('选择负样本生成策略'),
    
          noise_strength: Schema.number()
            .step(0.5)
            .min(0)
            .max(10)
            .default(1.0)
            .description('噪音强度参数'),
    
          contrastive_weight: Schema.number()
            .step(0.05)
            .min(0)
            .max(1)
            .default(0.05)
            .description('对比损失权重'),
    
          contrastive_warmup_steps: Schema.number()
            .step(10)
            .default(100)
            .description('使用随机负样本的步数'),
        }),
        Schema.object({}),
      ]),
    ]),
    // 预览图设置
    SHARED_SCHEMAS.PREVIEW_IMAGE,

    // 日志设置
    SHARED_SCHEMAS.LOG_SETTINGS,

    // caption 选项
    // FLUX 去除 max_token_length
    Schema.object(UpdateSchema(SHARED_SCHEMAS.RAW.CAPTION_SETTINGS, {}, ["max_token_length"])).description("caption（Tag）选项"),

    // 噪声设置
    SHARED_SCHEMAS.NOISE_SETTINGS,

    // 数据增强
    SHARED_SCHEMAS.DATA_ENCHANCEMENT,

    // 其他选项
    SHARED_SCHEMAS.OTHER,

    // 速度优化选项
    Schema.object(
        UpdateSchema(SHARED_SCHEMAS.RAW.PRECISION_CACHE_BATCH, {
            fp8_base: Schema.boolean().default(true).description("对基础模型使用 FP8 精度"),
            fp8_base_unet: Schema.boolean().description("仅对 U-Net 使用 FP8 精度（CLIP-L不使用）"),
            sdpa: Schema.boolean().default(true).description("启用 sdpa"),
            cache_text_encoder_outputs: Schema.boolean().default(true).description("缓存文本编码器的输出，减少显存使用。使用时需要关闭 shuffle_caption"),
            cache_text_encoder_outputs_to_disk: Schema.boolean().default(true).description("缓存文本编码器的输出到磁盘"),
        }, ["xformers"])
    ).description("速度优化选项"),

    // 分布式训练
    SHARED_SCHEMAS.DISTRIBUTED_TRAINING
]);
