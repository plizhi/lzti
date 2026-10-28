#!/usr/bin/env python3
"""ESP32 答题手柄模拟器（只用标准库）

模拟一台 ESP32 手柄的完整答题流程：
  1. 取配对码（用户在手机/网页端也能自己生成）
  2. 用配对码换设备令牌
  3. 按维度取题目
  4. 逐题模拟按键（1~5）
  5. 提交测评

用法：
  python3 scripts/device-simulator.py \\
    --base-url http://localhost:3010 \\
    --user-token <用户JWT> \\
    --stage primary-low \\
    --type parent \\
    [--code 123456] [--session-id xxx] [--random] [--questions-only]
"""

import argparse
import json
import random
import sys
import urllib.error
import urllib.request

BASE_URL = "http://localhost:3010"


def http(method, path, token=None, body=None, base_url=None):
    """发一个 HTTP 请求，打印 → method path / ← status，返回 (status, data)"""
    url = (base_url or BASE_URL).rstrip("/") + path
    data = None
    headers = {"Accept": "application/json"}

    if body is not None:
        data = json.dumps(body).encode("utf-8")
        headers["Content-Type"] = "application/json"

    if token:
        headers["Authorization"] = "Bearer " + token

    print("→ %s %s" % (method, path))
    req = urllib.request.Request(url, data=data, headers=headers, method=method)

    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            raw = resp.read().decode("utf-8")
            status = resp.status
    except urllib.error.HTTPError as e:
        raw = e.read().decode("utf-8", errors="replace")
        status = e.code
    except urllib.error.URLError as e:
        print("← 网络错误：%s" % e.reason)
        sys.exit(1)

    print("← %d" % status)

    try:
        parsed = json.loads(raw)
    except ValueError:
        print("   响应不是 JSON：%s" % raw[:200])
        sys.exit(1)

    if not parsed.get("success", False):
        print("   错误：%s" % parsed.get("error", raw[:200]))
        sys.exit(1)

    return status, parsed.get("data")


def resolve_session(args):
    """拿到一个可用的 sessionId：没给就现建一个（连带建孩子）"""
    if args.session_id:
        return args.session_id

    _, children = http("GET", "/api/children", token=args.user_token, base_url=args.base_url)
    items = children.get("children") or []
    if items:
        child_id = items[0]["id"]
        child_name = items[0].get("name", "")
    else:
        _, child = http(
            "POST",
            "/api/children",
            token=args.user_token,
            body={"name": "模拟器测试", "grade": "一年级"},
            base_url=args.base_url,
        )
        child_id = child["id"]
        child_name = child.get("name", "")

    print("使用孩子：%s（%s）" % (child_name, child_id))

    _, session = http(
        "POST",
        "/api/assessment/sessions",
        token=args.user_token,
        body={"childId": child_id, "stageId": args.stage},
        base_url=args.base_url,
    )
    print("新建测评会话：%s" % session["id"])
    return session["id"]


def get_pairing_code(args):
    if args.code:
        print("使用已有配对码：%s" % args.code)
        return args.code

    _, data = http(
        "POST",
        "/api/device/pairing-code",
        token=args.user_token,
        base_url=args.base_url,
    )
    print("配对码：%s（有效期至 %s）" % (data["code"], data["expiresAt"]))
    return data["code"]


def main():
    parser = argparse.ArgumentParser(description="荔枝测评 ESP32 手柄模拟器")
    parser.add_argument("--base-url", default=BASE_URL, help="服务地址")
    parser.add_argument("--user-token", required=True, help="用户 JWT")
    parser.add_argument("--code", help="配对码（不给就调接口生成）")
    parser.add_argument("--device-key", help="设备出厂标识（不给就随机生成）")
    parser.add_argument("--stage", default="primary-low", help="学段 ID")
    parser.add_argument("--type", default="parent", choices=["parent", "student", "teacher"])
    parser.add_argument("--session-id", help="测评会话 ID（不给就现建）")
    parser.add_argument("--random", action="store_true", help="随机打分（默认按 1..5 循环）")
    parser.add_argument("--questions-only", action="store_true", help="只取题目，不答题")
    parser.add_argument("--include-audio", action="store_true", help="取题目时带音频")
    args = parser.parse_args()

    device_key = args.device_key or ("sim-" + str(random.randint(100000, 999999)))

    # 1. 配对码
    code = get_pairing_code(args)

    # 2. 换设备令牌
    _, paired = http(
        "POST",
        "/api/device/pair",
        body={"code": code, "deviceKey": device_key, "name": "模拟手柄"},
        base_url=args.base_url,
    )
    device_token = paired["deviceToken"]
    print("设备令牌：%s…" % device_token[:16])
    print()

    # 3. 取题目
    query = "?stageId=%s&type=%s&dimensionIndex=0" % (args.stage, args.type)
    if args.include_audio:
        query += "&includeAudio=1"

    _, payload = http(
        "GET",
        "/api/device/questions" + query,
        token=device_token,
        base_url=args.base_url,
    )

    dimension = payload["dimensions"][0]
    print("【%s】%s（%s）" % (payload["stageName"], dimension["name"], dimension["axis"]))
    print("本维度共 %d 题，全卷 %d 题，共 %d 个维度"
          % (len(dimension["questions"]), payload["totalQuestions"], payload["totalDimensions"]))
    print()

    for q in dimension["questions"]:
        print("  Q%d. %s" % (q["globalIndex"] + 1, q["text"]))

    if args.questions_only:
        print()
        print("（--questions-only：到此为止）")
        return

    if args.include_audio:
        audio = payload.get("audio") or []
        print()
        print("服务端生成音频：%d 条" % len(audio))
        for item in audio[:1]:
            print("  %s → %d 字节(base64)" % (item["questionId"], len(item["audioBase64"])))

    print()

    # 4. 逐题作答（所有维度）
    session_id = resolve_session(args)
    print()

    value = 1
    answered = 0
    for dim_index in range(payload["totalDimensions"]):
        _, dim_payload = http(
            "GET",
            "/api/device/questions?stageId=%s&type=%s&dimensionIndex=%d"
            % (args.stage, args.type, dim_index),
            token=device_token,
            base_url=args.base_url,
        )
        dim = dim_payload["dimensions"][0]
        print("—— 维度 %d/%d：%s ——" % (dim_index + 1, payload["totalDimensions"], dim["name"]))

        for q in dim["questions"]:
            if args.random:
                v = random.randint(1, 5)
            else:
                v = value
                value = value % 5 + 1

            _, saved = http(
                "POST",
                "/api/device/answer",
                token=device_token,
                body={
                    "sessionId": session_id,
                    "questionnaireType": args.type,
                    "questionId": q["id"],
                    "value": v,
                    "currentDimensionIndex": dim_index,
                },
                base_url=args.base_url,
            )
            answered += 1
            print("   按键 %d → Q%d（已答 %d 题）" % (v, q["globalIndex"] + 1, saved["answeredCount"]))

    print()
    print("共作答 %d 题，提交测评…" % answered)

    # 5. 提交
    _, result = http(
        "POST",
        "/api/device/submit",
        token=device_token,
        body={"sessionId": session_id, "questionnaireType": args.type},
        base_url=args.base_url,
    )

    print()
    print("提交成功：attemptId=%s" % result["attemptId"])
    print("象限结果：%s" % json.dumps(result.get("quadrants"), ensure_ascii=False))


if __name__ == "__main__":
    main()
