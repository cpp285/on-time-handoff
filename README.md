# 准点交班

面向住院病区的电子交班 MVP。系统把本班病程、医嘱、检验和检查记录整理成结构化交班草稿，由交班医生核对确认，再由接班医生点击接收。

当前版本只使用虚构演示数据，不接入真实患者信息，也暂不包含登录、HIS 集成和线上部署。

## 已实现

- 5A 病区 10 位虚构患者的交班看板、重点筛选和搜索
- DeepSeek 批量生成任务、逐床进度、失败隔离和幂等操作
- 当前病情、本班变化、未完成事项、下一班关注、待医生确认五类结构化内容
- 每条 AI 内容回溯到病程、医嘱、检验或检查原文
- 医生编辑、手动补充、确认交班、接班医生接收
- 跨班未完成事项和患者往期交班时间线
- SQLite 本地持久化、版本快照和操作审计
- 桌面端与移动端响应式界面

## 本地运行

需要 Node.js 24 或其他支持 `node:sqlite` 的现代 Node.js 版本。

```bash
npm install
cp .env.example .env.local
npm run dev
```

打开 [http://localhost:3000](http://localhost:3000)。首次访问会在 `data/on-time-handoff.sqlite` 自动创建本地演示数据库，该目录已被 Git 忽略。

没有配置 DeepSeek 密钥时，项目会自动使用确定性的演示生成器，便于直接体验完整流程。接入真实模型时在 `.env.local` 中填写：

```bash
DEEPSEEK_API_KEY=your_api_key
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-v4-flash
```

密钥只在服务端读取，不会暴露到浏览器。当前真实 DeepSeek 调用尚未做密钥环境下的冒烟测试。

## 演示流程

1. 以“交班医生·沈医生”身份点击“生成本班交班”。
2. 打开任意患者卡，查看原文、编辑草稿或补充事项。
3. 点击“核对无误，确认交班”。
4. 切换到“接班医生·何医生”，点击“接收本次交班”。
5. 接班后可继续处理跨班未完成事项并查看往期时间线。

如需恢复首次打开时的演示状态，请停止开发服务器后删除 `data/on-time-handoff.sqlite*`，再次启动即可重新生成。

## 项目结构

```text
src/app/                         页面、错误边界和 Route Handlers
src/features/handoff/            交班领域类型、校验、演示数据和界面
src/lib/server/db.ts             SQLite 建表与初始化
src/lib/server/deepseek.ts       DeepSeek Responses API 适配
src/lib/server/handoff-repository.ts
                                 交班事务、版本与查询逻辑
src/lib/server/generation-runner.ts
                                 并发生成任务执行器
```

## 质量检查

```bash
npm run test
npm run typecheck
npm run lint
npm run build
```

PRD、架构设计和两份技术栈手册仅供本地参考，均已写入 `.gitignore`，不会提交到 Git。
