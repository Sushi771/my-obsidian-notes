module.exports = async (params) => {
    const { app, quickAddApi } = params;
    
    // 1. 获取当前活动文件
    const activeFile = app.workspace.getActiveFile();
    if (!activeFile) {
        console.log("没有打开任何文件！");
        return;
    }

    console.log(`🚀 [v2.0 深度处理] 正在分析: ${activeFile.name}...`);
    
    // 2. 读取内容
    const fileContent = await app.vault.read(activeFile);
    
    // 3. 构建超级 Prompt
    const prompt = `
你是一个顶级的教育智库分析专家，请深度阅读以下公众号文章，并输出结构化的整理建议。

【第一步：判断是否为广告/软文】
如果文章符合以下任意2条特征，请归类到"📢 07_广告与软文"的细分目录：

广告细分类型：
- 1_小升初择校营销: 推荐小升初机构占坑、SMK神秘考、机构SWOT分析（实际引流）
- 2_竞赛培训营销: 推广数学/信息学/物理等竞赛课程、冬令营、名师班（如"有道领世"、"付云皓"）
- 3_中高考冲刺营销: 中考志愿讲座、高考冲刺班、志愿填报服务
- 4_学科辅导营销: 单科培训推广（物理/英语/数学等），B站UP主、教辅书引流
- 5_科创赛事营销: 科普英语演讲、科创比赛辅导班（如"烤鸡老师"、"WorldStorm"）
- 6_家庭教育营销: 家长课堂、鸡娃方法论、升学规划咨询付费服务
- 7_资料引流型: 以"免费资料包"、"扫码入群"、"加客服领取"为主要引流方式

【层级目录树】
📢 07_广告与软文 (推广机构/课程/招生的文章)
  ├── 1_小升初择校营销 (机构占坑、SMK、升学规划)
  ├── 2_竞赛培训营销 (竞赛课程、冬令营、名师班)
  ├── 3_中高考冲刺营销 (中考/高考培训班、志愿填报服务)
  ├── 4_学科辅导营销 (语数外物化等单科培训)
  ├── 5_科创赛事营销 (科普英语、科创比赛辅导)
  ├── 6_家庭教育营销 (家长课程、鸡娃方法论)
  └── 7_资料引流型 (免费资料包引流、加群领取)
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

请必须严格按照以下 JSON 格式返回（不要在 JSON 外带任何文字解释）：
{
  "tags": "标签1,标签2,标签3",
  "folder": "一级目录名/二级目录名",
  "newTitle": "洗练后的纯净文件名（不带扩展名，移除日期乱码）",
  "summary": "3条简明扼要的核心点摘要（用换行符分开）",
  "importance": 1到5的数字,
  "entities": "文中出现的关键学校名、机构名或政策术语（逗号隔开）"
}

文章内容：
${fileContent.substring(0, 3000)}
    `;

    try {
        const rawResult = await quickAddApi.ai.prompt(prompt, "qwen-plus");
        
        let parsedData;
        let textResult = "";
        if (typeof rawResult === "string") { textResult = rawResult; }
        else if (typeof rawResult === "object" && rawResult.output) { textResult = rawResult.output; }
        else if (typeof rawResult === "object" && rawResult.text) { textResult = rawResult.text; }

        const cleanResult = textResult.replace(/```json/g, "").replace(/```/g, "").trim();
        parsedData = JSON.parse(cleanResult);
        
        // 4. 更新 Frontmatter (摘要、评分、标签)
        await app.fileManager.processFrontMatter(activeFile, (fm) => {
            const newTags = parsedData.tags.split(",").map(t => t.trim());
            fm.tags = [...new Set([...(fm.tags || []), ...newTags])];
            fm.summary = parsedData.summary;
            fm.importance = "⭐".repeat(parsedData.importance);
            fm.processed_at = new Date().toISOString().split('T')[0];
        });
        
        // 5. 追加双链 (Entity Links) 到文件末尾以增强关系图谱
        const entityLinks = "\n\n---\n**关联实体**： " + 
            parsedData.entities.split(",").map(e => `[[${e.trim()}]]`).join(" ");
        await app.vault.append(activeFile, entityLinks);
        
        // 6. 移动并重命名文件
        const rootCategory = "已分类文章";
        const targetParts = parsedData.folder.split("/");
        let currentPath = rootCategory;
        
        // 确保目录存在
        if (!app.vault.getAbstractFileByPath(rootCategory)) await app.vault.createFolder(rootCategory);
        for (const part of targetParts) {
            currentPath += "/" + part.trim();
            if (!app.vault.getAbstractFileByPath(currentPath)) await app.vault.createFolder(currentPath);
        }
        
        // 执行重命名+移动
        const newFileName = `${parsedData.newTitle.replace(/[\/\\?%*:|"<>]/g, '-')}.md`;
        const finalPath = `${currentPath}/${newFileName}`;
        
        await app.fileManager.renameFile(activeFile, finalPath);
        
        console.log(`✅ [处理成功] 新文件名: ${newFileName}\n归类: ${parsedData.folder}`);
        
    } catch (e) {
        console.error("AI 脚本执行错误:", e);
    }
};
