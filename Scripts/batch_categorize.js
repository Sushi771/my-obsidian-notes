module.exports = async (params) => {
    const { app, quickAddApi } = params;
    
    const sourceFolderPath = "公众号的文章（待分类）";
    const apiCooldownMs = 3500; // 批量处理稍大幅度增加冷却
    const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
    const sourceFolder = app.vault.getAbstractFileByPath(sourceFolderPath);
    
    if (!sourceFolder || !sourceFolder.children) {
        console.error("找不到待分类文件夹。");
        return;
    }
    
    const filesToProcess = sourceFolder.children.filter(file => file.extension === "md");
    console.log(`🚀 [v2.0 批量启动] 准备深度处理 ${filesToProcess.length} 篇文章...`);
    
    for (const file of filesToProcess) {
        console.log(`⏳ 正在深度分析: ${file.name}...`);
        const fileContent = await app.vault.read(file);
        
        const prompt = `
你是一个顶级的教育智库分析专家，请深度阅读以下文章，并输出结构化的整理建议。

我的【层级目录树】如下：
🏫 01_学校与区域解析 (选校刚需)
  ├── 1_小学段 (公办学区划片、民办摇号、特色小学)
  ├── 2_初中段 (头部初中揭秘、加工能力分析)
  ├── 3_高中段 (八大四大名校、特色高中)
  └── 4_一贯制与国际校 (K12、体制外路线)
🏆 02_学科竞赛与白名单赛事 (按参赛年龄段严格划分)
  ├── 1_小学段赛事 (编程、机器人、英语素养等)
  ├── 2_初中段赛事 (衔接类竞赛、科创类)
  └── 3_高中段五大奥赛 (数、理、化、生、信深度解析)
🎓 03_升学路径与政策规划 (节点战役)
  ├── 1_幼升小_小升初 (择校政策、简历准备)
  ├── 2_初升高_中考 (名额分配、自招政策)
  └── 3_高考_强基综评 (强基计划、综合评价、志愿填报)
📚 04_学习方法与提分干货 (不同阶段痛点不同)
  ├── 1_小学_习惯与启蒙 (时间管理、阅读习惯、数学思维)
  ├── 2_中学_应试与提分 (各科学习法、错题本、冲刺策略)
  └── 3_通用资源工具 (书单、纪录片、教辅测评)
👨‍👩‍👧 05_家庭教育与心理成长 (小红书高赞区)
  ├── 1_儿童期_情绪与习惯 (注意力不集中、拖拉)
  ├── 2_青春期_叛逆与沟通 (早恋、厌学、亲子冲突)
  └── 3_家长心态与鸡娃生态 (教育内卷、焦虑缓解)
💡 06_教育宏观现象与深度洞察
  ├── 政策大方向解读 (双减后时代、中考改革等)
  └── 典型案例剖析 (牛娃经验、普娃逆袭)

请必须严格按照以下 JSON 格式返回：
{
  "tags": "标签1,标签2,标签3",
  "folder": "一级目录名/二级目录名",
  "newTitle": "洗练后的纯净文件名（不带扩展名）",
  "summary": "3条简明扼要的核心点摘要",
  "importance": 1到5的数字,
  "entities": "文中出现的关键实体（逗号隔开）"
}

文章内容：
${fileContent.substring(0, 3000)}
        `;

        try {
            const rawResult = await quickAddApi.ai.prompt(prompt, "qwen-plus");
            let textResult = (typeof rawResult === "string") ? rawResult : (rawResult.output || rawResult.text || "");
            const parsedData = JSON.parse(textResult.replace(/```json/g, "").replace(/```/g, "").trim());
            
            // 写入元数据
            await app.fileManager.processFrontMatter(file, (fm) => {
                fm.tags = [...new Set([...(fm.tags || []), ...parsedData.tags.split(",").map(t => t.trim())])];
                fm.summary = parsedData.summary;
                fm.importance = "⭐".repeat(parsedData.importance);
            });
            
            // 追加实体双链
            const links = "\n\n---\n**关联实体**： " + parsedData.entities.split(",").map(e => `[[${e.trim()}]]`).join(" ");
            await app.vault.append(file, links);
            
            // 目录创建
            const rootCategory = "已分类文章";
            let currentPath = rootCategory;
            if (!app.vault.getAbstractFileByPath(currentPath)) await app.vault.createFolder(currentPath);
            for (const part of parsedData.folder.split("/")) {
                currentPath += "/" + part.trim();
                if (!app.vault.getAbstractFileByPath(currentPath)) await app.vault.createFolder(currentPath);
            }
            
            // 重命名并移动
            const newName = `${parsedData.newTitle.replace(/[\/\\?%*:|"<>]/g, '-')}.md`;
            await app.fileManager.renameFile(file, `${currentPath}/${newName}`);
            
            console.log(`✅ [完成] ${newName}`);
        } catch (e) {
            console.error(`❌ 跳过 ${file.name}:`, e);
        }
        await sleep(apiCooldownMs); 
    }
    console.log("🎉 [v2.0 批量任务] 全路流水线深度整理完成！");
};
