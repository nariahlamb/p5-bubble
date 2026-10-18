#!/system/bin/sh
# p5-bubble 同步脚本 —— 唯一的部署/回拉入口，用来终结「属主反复变导致写入被拒」的问题。
#
# 用法（全部经 shizuku_exec 执行，因为它需要读写 Android/data）：
#   sh <repo>/tools/sync.sh check     只比对哈希，不动文件
#   sh <repo>/tools/sync.sh deploy    仓库 → 真机（改完代码后跑这个）
#   sh <repo>/tools/sync.sh pull      真机 → 仓库（在 App 里改过东西后跑这个）
#
# 为什么需要它：
#   shizuku 是 root，cp 出来的文件属主是 root:root；而 proot 容器以 App 身份(10191)写文件，
#   遇到 root:root 644 直接 Permission denied，而容器里自己的 chown 全是 EPERM。
#   所以每次复制完必须按目标侧的身份 chown，这一步不能漏。脚本里已固定处理。

EXT=/storage/emulated/0/Android/data/com.tauritavern.client/data/extensions/third-party/p5-bubble
REPO=/data/data/excp.rikkahub.agents/files/workspaces/07c1de5b-7ede-413c-8778-b85c06ea44f7/files/projects/p5-bubble/repo
WORLDS=/storage/emulated/0/Android/data/com.tauritavern.client/data/default-user/worlds

FILES="index.js style.css manifest.json"
WORLDBOOK="P5气泡格式.json"

REPO_UID=10191:10191          # proot 容器里 App 的身份
EXT_UID=$(stat -c '%u:%g' "$EXT" 2>/dev/null)   # 真机扩展目录自己的属主，别硬编码

die() { echo "FAIL: $*" >&2; exit 1; }

[ -d "$EXT" ] || die "扩展目录不存在：$EXT"
[ -d "$REPO" ] || die "仓库目录不存在：$REPO"
[ -n "$EXT_UID" ] || die "读不到扩展目录属主"

h() { sha256sum "$1" 2>/dev/null | cut -d' ' -f1; }

# 比对三个扩展文件 + 世界书，打印结果
do_check() {
    echo "=== 扩展文件 ==="
    rc=0
    for f in $FILES; do
        a=$(h "$REPO/$f"); b=$(h "$EXT/$f")
        if [ -z "$b" ]; then echo "  $f  真机缺失"; rc=1
        elif [ "$a" = "$b" ]; then echo "  $f  一致  ${a%"${a#????????}"}…"
        else echo "  $f  不同  仓库=${a%"${a#????????}"}… 真机=${b%"${b#????????}"}…"; rc=1
        fi
    done
    echo "=== 世界书 ==="
    a=$(h "$REPO/$WORLDBOOK"); b=$(h "$WORLDS/$WORLDBOOK")
    if [ -z "$b" ]; then echo "  $WORLDBOOK  真机缺失"
    elif [ "$a" = "$b" ]; then echo "  $WORLDBOOK  一致"
    else echo "  $WORLDBOOK  不同  仓库=$(wc -c <"$REPO/$WORLDBOOK")B 真机=$(wc -c <"$WORLDS/$WORLDBOOK")B"; rc=1
    fi
    return $rc
}

# 仓库 → 真机。先备份，再复制，最后按真机目录属主 chown
do_deploy() {
    ts=$(date +%Y%m%d-%H%M%S)
    for f in $FILES; do
        [ -s "$REPO/$f" ] || die "仓库里的 $f 不存在或为空，拒绝部署"
        a=$(h "$REPO/$f"); b=$(h "$EXT/$f")
        [ "$a" = "$b" ] && { echo "  $f  已是最新，跳过"; continue; }
        [ -n "$b" ] && cp -f "$EXT/$f" "$EXT/$f.bak-$ts"
        cp -f "$REPO/$f" "$EXT/$f" || die "复制 $f 失败"
        chown "$EXT_UID" "$EXT/$f" || die "chown $f 失败"
        echo "  $f  已更新 → $(wc -c <"$EXT/$f")B"
    done
    echo "备份后缀：.bak-$ts"
    echo "提醒：TT 里重新启用扩展或重启 App 才会加载新代码"
}

# 真机 → 仓库。复制后 chown 成 App 身份，否则容器的写入权限又会丢
do_pull() {
    for f in $FILES; do
        [ -s "$EXT/$f" ] || { echo "  $f  真机缺失，跳过"; continue; }
        a=$(h "$REPO/$f"); b=$(h "$EXT/$f")
        [ "$a" = "$b" ] && { echo "  $f  无变化"; continue; }
        cp -f "$EXT/$f" "$REPO/$f" || die "回拉 $f 失败"
        chown "$REPO_UID" "$REPO/$f" || die "chown $f 失败"
        echo "  $f  已回拉 → $(wc -c <"$REPO/$f")B"
    done
    if [ -s "$WORLDS/$WORLDBOOK" ]; then
        a=$(h "$REPO/$WORLDBOOK"); b=$(h "$WORLDS/$WORLDBOOK")
        if [ "$a" != "$b" ]; then
            cp -f "$WORLDS/$WORLDBOOK" "$REPO/$WORLDBOOK" || die "回拉世界书失败"
            chown "$REPO_UID" "$REPO/$WORLDBOOK"
            echo "  $WORLDBOOK  已回拉 → $(wc -c <"$REPO/$WORLDBOOK")B"
        else echo "  $WORLDBOOK  无变化"; fi
    fi
    echo "别忘 git commit"
}

case "$1" in
    check)  do_check ;;
    deploy) do_deploy; echo; do_check ;;
    pull)   do_pull;   echo; do_check ;;
    *) echo "用法：sh $0 {check|deploy|pull}"; exit 2 ;;
esac
