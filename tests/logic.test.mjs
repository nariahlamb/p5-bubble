import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeLine, findDialogues, splitDialogue, splitDanmuText, parseDanmu, parseForum, bubblePath, themeCss, THEMES, DAY_PRESETS, NIGHT_PRESETS, DEFAULTS } from '../index.js';

const ALL = { ...DEFAULTS, forum: true, danmu: true };

test('台词识别：动词引导 / 标点 / 长度', () => {
    assert.equal(findDialogues('他慢吞吞地说，“也好。签了名字，就算是本校的学员了。”').length, 1);
    assert.equal(findDialogues('「看来各位都很谨慎。」').length, 1);
    assert.equal(findDialogues('这就是所谓的“规则”而已').length, 0, '短词引用不算台词');
    assert.equal(findDialogues('他说"ok"').length, 1, '动词引导的短英文台词');
});

test('混合行拆成 文本+气泡', () => {
    const r = analyzeLine('他慢吞吞地说，“也好。签了名字，就算是本校的学员了。”', ALL);
    assert.equal(r.kind, 'dialogue');
    assert.equal(r.parts[0].type, 'text');
    assert.equal(r.parts[1].type, 'bubble');
});

test('长台词按标点拆分', () => {
    assert.deepEqual(splitDialogue('也好。签了名字，就算是本校的学员了。走吧！', 10), ['也好。签了名字，就算是本校的学员了。', '走吧！']);
    assert.deepEqual(splitDialogue('一二三四五六七八九十！！再来', 10), ['一二三四五六七八九十！！', '再来']);
    assert.deepEqual(splitDialogue('abc', 0), ['abc']);
});

test('弹幕 / 论坛', () => {
    assert.equal(parseDanmu('【前方高能】'), '前方高能');
    assert.equal(parseDanmu('【系统】提示：你获得了道具'), null, '非整行包裹不算');
    assert.deepEqual(parseForum('阿瞳：今天也要加油'), { name: '阿瞳', content: '今天也要加油' });
    assert.equal(parseForum('他笑道：好啊'), null, '说话动词结尾=叙述');
    assert.equal(analyzeLine('【路人甲：这剧情绝了】', ALL).kind, 'forum');
    assert.equal(analyzeLine('【前方高能】', ALL).kind, 'danmu');
    assert.equal(analyzeLine('【前方高能】', { ...ALL, danmu: false }).kind, 'plain');
    assert.equal(analyzeLine('阿瞳：今天也要加油', { ...ALL, forum: false }).kind, 'plain');
});

test('开关全关 = 原样', () => {
    const off = { ...ALL, dialogue: false, forum: false, danmu: false };
    for (const s of ['“你好啊，朋友。”', '【前方高能】', '阿瞳：hi']) assert.equal(analyzeLine(s, off).kind, 'plain');
});

test('引号错配不吞文本', () => {
    assert.equal(findDialogues('“你好」后面还有很多很多很多字').length, 0);
});

test('主题表完整', () => {
    for (const n of [...DAY_PRESETS, ...NIGHT_PRESETS]) {
        const t = THEMES[n];
        assert.ok(t, n);
        assert.equal(t.pal.length, 7);
        assert.match(themeCss(t, 1), /--p5b-rSh:#[0-9a-fA-F]{6};/);
    }
});

test('弹幕切字', () => {
    assert.deepEqual(splitDanmuText('短句', 24), ['短句'], '没到阈值原样');
    assert.deepEqual(splitDanmuText('一二三四五六七八', 0), ['一二三四五六七八'], '0=不切');
    assert.deepEqual(splitDanmuText('一二三四，五六', 4), ['一二三四，', '五六'], '标点处断');
    assert.deepEqual(splitDanmuText('abcdefgh', 3), ['abcde', 'fgh'], '无标点按 1.5 倍硬切');
    assert.deepEqual(splitDanmuText('【】', 5), ['【】']);
});

test('气泡宽度写进注入样式', () => {
    const t = THEMES['P5柔和'];
    assert.match(themeCss(t, 1, 80), /p5b-bubble\{width:80%;\}/);
    assert.doesNotMatch(themeCss(t, 1, 0), /p5b-bubble\{width/, '0 = 不输出宽度规则');
    assert.match(themeCss(t, 1, 999), /width:100%;/, '上限夹到 100');
});

test('气泡路径', () => {
    assert.match(bubblePath('left', 200, 80, 0.3), /^M [\d.\- ]+( L [\d.\- ]+){7} Z$/);
    assert.match(bubblePath('right', 200, 80, 0.3), /^M [\d.\- ]+( L [\d.\- ]+){8} Z$/);
});
