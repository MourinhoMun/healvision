# 客户端软件接入指南 —— 激活码与积分系统

> **本文档用途**：当你开发任何新的客户端软件（桌面端、移动端均可），把这份文档给 AI 读，它就能帮你写出完整的激活码和积分逻辑。

---

## 重要：用户首次使用须知

用户首次打开软件时**没有激活码**。软件必须在激活码输入界面显示以下提示信息：

**"如需获取激活码，请添加鹏哥微信：peng_ip"**

这段文字必须清晰展示在激活码输入框附近，确保用户能看到。

---

## 一、整体架构

```
用户的电脑/手机
    ↓ HTTP 请求
你的网站后端（Next.js + SQLite）
    ↓ 数据库操作
用户表 / 激活码表 / 积分流水表
```

每个客户端软件**不需要自己管用户系统**，所有用户、积分、激活码都由网站后端统一管理。软件只需要调后端的 API 接口。

---

## 二、后端地址

- 本地开发：`http://localhost:3000`
- 生产环境：替换为你的实际域名，例如 `https://yourdomain.com`

下文用 `{BASE_URL}` 代替。

---

## 三、核心概念

### 1. 设备 ID（deviceId）
每个客户端必须生成一个**唯一的设备标识**，用于绑定用户身份。

生成方式建议：
- **Windows**：读取主板序列号 + CPU ID，做一次 MD5/SHA256 哈希
- **macOS**：读取硬件 UUID（`system_profiler SPHardwareDataType`）
- **通用方案**：首次启动时生成一个 UUID，存到本地文件/注册表，以后一直用这个

关键要求：
- 同一台设备每次启动必须得到**相同的 deviceId**
- 不同设备的 deviceId 必须**不同**

### 2. Token（令牌）
用户激活成功后，后端会返回一个 JWT Token，有效期 **365 天**。软件需要把这个 Token 保存到本地（文件、注册表、或 SQLite 本地库都行），后续所有请求都带上它。

### 3. 积分（Points）
用户的余额。使用功能要扣积分，积分不够就不能用。用户需要通过充值码补充积分。

---

## 四、API 接口详细说明

### 接口 1：激活（首次使用 / 充值）

```
POST {BASE_URL}/api/v1/user/activate
Content-Type: application/json
```

**请求体：**
```json
{
  "code": "A3B2-XYZW-4F9P-2Q8R",
  "deviceId": "e3b0c44298fc1c149afb..."
}
```

**成功响应（200）：**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "userId": "cm1abc2def",
    "balance": 500
  }
}
```

**失败响应：**
| 状态码 | 错误信息 | 含义 |
|--------|---------|------|
| 400 | `Code and deviceId are required` | 参数缺失 |
| 404 | `Invalid activation code` | 激活码不存在 |
| 400 | `Activation code has expired` | 激活码已过期 |
| 400 | `Activation code has reached maximum uses` | 激活码已达到最大设备数 |
| 500 | `User not found for this device. Please activate a license first.` | 用充值码但没先用许可证码激活过 |

**一码多机规则：**
- 每个激活码最多可在 **3 台设备**上激活（后端 `maxUses` 默认值为 3）
- 同一台设备重复使用同一个码，不会消耗次数，直接返回 token（相当于重新登录）
- 激活码状态变化：`unused`（未使用）→ `active`（已有设备使用但未满）→ `used`（3 台设备全部用完）

**两种激活码的区别：**
- **许可证码（license）**：首次激活用。会创建用户并充入积分。如果设备已激活过，也会叠加积分。
- **充值码（recharge）**：补充积分用。设备必须先用许可证码激活过，否则报错。

> 软件端不需要区分这两种码，统一调这一个接口就行，后端会自动处理。

---

### 接口 2：查询余额

```
GET {BASE_URL}/api/v1/user/balance
Authorization: Bearer {token}
```

**成功响应（200）：**
```json
{
  "balance": 350
}
```

**失败响应：**
| 状态码 | 错误信息 | 含义 |
|--------|---------|------|
| 401 | `Missing token` | 没带 Token |
| 403 | `Invalid token` | Token 无效或过期 |
| 404 | `User not found` | 用户不存在 |

---

### 接口 3：使用功能（扣积分）

```
POST {BASE_URL}/api/v1/proxy/generate
Authorization: Bearer {token}
Content-Type: application/json
```

**请求体：**
```json
{
  "prompt": "一只可爱的猫咪",
  "width": 1024,
  "height": 1024,
  "batch_size": 1
}
```

**成功响应（200）：**
```json
{
  "success": true,
  "images": ["https://..."],
  "remaining_points": 340,
  "cost": 10
}
```

**失败响应：**
| 状态码 | 错误信息 | 含义 |
|--------|---------|------|
| 401 | `Missing token` | 没带 Token |
| 403 | `Invalid token` | Token 无效或过期 |
| 402 | `积分不足` | 余额不够 |

> **重要**：上面这个接口是 AI 图片生成专用的。如果你的新软件是做别的功能（比如 AI 写文章、AI 剪视频），你需要在后端**新建一个类似的接口**，修改扣费逻辑和实际功能调用。具体看下面第六节。

---

## 五、软件端完整流程（必须实现）

### 流程图

```
软件启动
  │
  ├─ 本地有 Token？
  │    │
  │    ├─ 有 → 调「查询余额」接口
  │    │        │
  │    │        ├─ 成功 → 显示主界面 + 余额
  │    │        │
  │    │        └─ 失败(401/403) → Token 过期，删除本地 Token
  │    │                            → 跳到「激活码输入界面」
  │    │
  │    └─ 没有 → 显示「激活码输入界面」
  │
  │
激活码输入界面
  │
  ├─ 界面上必须显示提示文字：
  │    「如需获取激活码，请添加鹏哥微信：peng_ip」
  │
  ├─ 用户输入激活码，点击「激活」
  │    │
  │    ├─ 调「激活」接口
  │    │    │
  │    │    ├─ 成功 → 保存 Token 到本地
  │    │    │         → 进入主界面
  │    │    │
  │    │    └─ 失败 → 显示错误提示
  │    │              （码无效 / 已达最大设备数 / 请先激活许可证）
  │
  │
主界面（显示当前余额）
  │
  ├─ 用户点击功能按钮
  │    │
  │    ├─ 先查余额，积分够吗？
  │    │    │
  │    │    ├─ 够 → 调「使用功能」接口 → 执行 → 更新显示的余额
  │    │    │
  │    │    └─ 不够 → 弹窗提示「积分不足，请充值」
  │    │              → 提供「输入充值码」的入口
  │    │              → 同时显示提示：「如需购买充值码，请添加鹏哥微信：peng_ip」
  │
  ├─ 用户点击「充值」按钮
  │    │
  │    └─ 弹出激活码输入框 → 调「激活」接口 → 充值成功 → 刷新余额
```

### 本地需要持久化存储的数据

| 数据 | 说明 | 存储方式建议 |
|------|------|------------|
| `deviceId` | 设备唯一标识 | 文件 / 注册表 / 配置文件 |
| `token` | JWT 令牌 | 文件 / 注册表 / 配置文件 |

只需要存这两个东西，其他数据都从服务端实时获取。

---

## 六、如何为新软件添加后端接口

当你做一个新软件（比如"AI 论文助手"），需要在网站后端新增一个扣费接口。

### 第 1 步：在后端创建新的 API 路由

文件位置：`peng-ip-website/app/api/v1/proxy/` 目录下新建文件夹

例如做一个"AI 写文章"功能，创建：
`app/api/v1/proxy/write-article/route.ts`

### 第 2 步：接口代码模板

```typescript
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/app/lib/db';
import { verify } from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-it';
const COST_PER_USE = 5; // 每次使用消耗的积分，按需调整

export async function POST(request: NextRequest) {
    try {
        // ===== 1. 鉴权（固定写法，直接复制） =====
        const authHeader = request.headers.get('Authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Missing token' }, { status: 401 });
        }
        const token = authHeader.split(' ')[1];

        let decoded;
        try {
            decoded = verify(token, JWT_SECRET) as any;
        } catch (e) {
            return NextResponse.json({ error: 'Invalid token' }, { status: 403 });
        }

        const { userId } = decoded;

        // ===== 2. 解析请求参数（按你的功能需求改） =====
        const body = await request.json();
        const { /* 你的参数 */ } = body;

        // ===== 3. 计算费用 =====
        const totalCost = COST_PER_USE;

        // ===== 4. 事务：检查余额 + 扣费（固定写法，直接复制） =====
        const result = await prisma.$transaction(async (tx) => {
            const user = await tx.user.findUnique({ where: { id: userId } });
            if (!user) throw new Error('User not found');

            if (user.points < totalCost) {
                throw new Error('Insufficient points');
            }

            const updatedUser = await tx.user.update({
                where: { id: userId },
                data: { points: { decrement: totalCost } }
            });

            await tx.pointTransaction.create({
                data: {
                    userId: userId,
                    amount: -totalCost,
                    type: 'use_tool',
                    description: '你的功能描述',
                    relatedId: 'your_tool_id'
                }
            });

            return updatedUser;
        });

        // ===== 5. 执行实际功能（按你的业务逻辑写） =====
        // 比如调用 OpenAI API、调用其他 AI 服务等
        const resultData = { /* 你的返回数据 */ };

        // ===== 6. 返回结果 =====
        return NextResponse.json({
            success: true,
            data: resultData,
            remaining_points: result.points,
            cost: totalCost
        });

    } catch (error: any) {
        if (error.message === 'Insufficient points') {
            return NextResponse.json({ error: '积分不足' }, { status: 402 });
        }
        console.error('Error:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
```

### 第 3 步：告诉软件端调用新接口

软件端只需把"使用功能"的请求地址改成新接口：
```
POST {BASE_URL}/api/v1/proxy/write-article
```

鉴权方式、请求头格式都不变，和图片生成接口完全一样。

---

## 七、错误处理规范

所有软件必须统一处理以下错误码：

| HTTP 状态码 | 含义 | 软件端应该做什么 |
|-------------|------|----------------|
| 200 | 成功 | 正常处理 |
| 400 | 参数错误 / 码已使用 | 显示错误提示 |
| 401 | 没带 Token | 跳转到激活码输入界面 |
| 402 | 积分不足 | 提示充值，显示当前余额和所需积分 |
| 403 | Token 无效/过期 | 清除本地 Token，跳转到激活码输入界面 |
| 404 | 资源不存在（码不存在/用户不存在）| 显示对应错误提示 |
| 500 | 服务器内部错误 | 提示"服务器繁忙，请稍后重试" |

---

## 八、完整代码示例（Python 版）

以下是一个最精简的 Python 客户端示例，展示完整的激活 + 使用流程：

```python
import requests
import uuid
import hashlib
import os
import json

# ============ 配置 ============
BASE_URL = "http://localhost:3000"  # 上线后改成你的域名
CONFIG_FILE = "config.json"         # 本地存储 token 和 deviceId

# ============ 设备 ID ============
def get_device_id():
    """生成或读取设备唯一标识"""
    config = load_config()
    if config.get("deviceId"):
        return config["deviceId"]

    # 首次运行，生成 deviceId
    # 简单方案：用 UUID + 机器名做哈希
    raw = f"{uuid.getnode()}-{os.environ.get('COMPUTERNAME', 'unknown')}"
    device_id = hashlib.sha256(raw.encode()).hexdigest()

    config["deviceId"] = device_id
    save_config(config)
    return device_id

# ============ 本地配置读写 ============
def load_config():
    if os.path.exists(CONFIG_FILE):
        with open(CONFIG_FILE, "r") as f:
            return json.load(f)
    return {}

def save_config(config):
    with open(CONFIG_FILE, "w") as f:
        json.dump(config, f)

# ============ API 调用 ============
def activate(code: str) -> dict:
    """激活或充值"""
    resp = requests.post(f"{BASE_URL}/api/v1/user/activate", json={
        "code": code,
        "deviceId": get_device_id()
    })
    data = resp.json()

    if resp.status_code == 200 and data.get("success"):
        # 保存 token
        config = load_config()
        config["token"] = data["token"]
        save_config(config)
        print(f"激活成功！当前积分：{data['user']['balance']}")
        return data
    else:
        print(f"激活失败：{data.get('error', '未知错误')}")
        return None

def get_balance() -> int:
    """查询余额"""
    config = load_config()
    token = config.get("token")
    if not token:
        print("未激活，请先输入激活码")
        return -1

    resp = requests.get(f"{BASE_URL}/api/v1/user/balance", headers={
        "Authorization": f"Bearer {token}"
    })

    if resp.status_code == 200:
        balance = resp.json()["balance"]
        print(f"当前积分：{balance}")
        return balance
    elif resp.status_code in (401, 403):
        print("Token 已过期，请重新激活")
        config.pop("token", None)
        save_config(config)
        return -1
    else:
        print(f"查询失败：{resp.json().get('error')}")
        return -1

def use_feature(prompt: str, batch_size: int = 1) -> dict:
    """使用功能（以 AI 生图为例）"""
    config = load_config()
    token = config.get("token")
    if not token:
        print("未激活，请先输入激活码")
        return None

    resp = requests.post(f"{BASE_URL}/api/v1/proxy/generate",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "prompt": prompt,
            "width": 1024,
            "height": 1024,
            "batch_size": batch_size
        }
    )

    if resp.status_code == 200:
        data = resp.json()
        print(f"生成成功！剩余积分：{data['remaining_points']}")
        return data
    elif resp.status_code == 402:
        print("积分不足，请充值。如需购买充值码，请添加鹏哥微信：peng_ip")
        return None
    elif resp.status_code in (401, 403):
        print("Token 已过期，请重新激活")
        return None
    else:
        print(f"失败：{resp.json().get('error')}")
        return None

# ============ 主程序 ============
def main():
    print("=== 软件启动 ===")

    # 1. 检查是否已激活
    balance = get_balance()

    if balance == -1:
        # 未激活，要求输入激活码
        print("如需获取激活码，请添加鹏哥微信：peng_ip")
        code = input("请输入激活码：").strip()
        result = activate(code)
        if not result:
            return

    # 2. 主循环
    while True:
        print("\n--- 菜单 ---")
        print("1. 使用 AI 生图")
        print("2. 查看余额")
        print("3. 充值（输入充值码）")
        print("0. 退出")

        choice = input("请选择：").strip()

        if choice == "1":
            prompt = input("输入描述：").strip()
            use_feature(prompt)
        elif choice == "2":
            get_balance()
        elif choice == "3":
            code = input("请输入充值码：").strip()
            activate(code)
        elif choice == "0":
            break

if __name__ == "__main__":
    main()
```

---

## 九、给 AI 的提示词模板

当你开发新软件时，把以下内容连同本文档一起发给 AI：

```
请帮我开发一个 [软件名称] 客户端。

功能说明：[描述你的软件要做什么]

技术要求：
- 使用 [Python / C# / Electron / 其他语言]
- 必须接入我的网站后端的激活码和积分系统
- 具体接入方式请严格按照 CLIENT_SOFTWARE_GUIDE.md 文档来实现
- 后端地址是 {BASE_URL}

需要实现的界面：
1. 激活码输入界面（首次打开 / Token 过期时显示）
2. 主功能界面（显示当前积分余额）
3. 充值入口（积分不足时引导充值）

如果需要新的后端扣费接口，也请按照文档第六节的模板帮我写好后端代码。
```

---

## 十、注意事项

1. **所有软件共用同一套后端**，不需要每个软件单独搭后端
2. **一个激活码最多可激活 3 台设备**，同一设备重复激活不消耗次数
3. **一个设备 = 一个用户**，换电脑需要用新的激活次数
4. **Token 有效期 365 天**，过期后需要用新的激活码重新激活
5. **充值码和许可证码的区别**：软件端不用管，统一调 `/api/v1/user/activate` 接口
6. **不同软件如果要不同的扣费规则**，需要在后端新建对应的 API 路由（参考第六节）
7. **JWT_SECRET 环境变量**：本地开发和生产环境必须设置为相同的值，否则 Token 会失效
8. **激活码输入界面必须显示**：「如需获取激活码，请添加鹏哥微信：peng_ip」
9. **积分不足时必须显示**：「如需购买充值码，请添加鹏哥微信：peng_ip」
