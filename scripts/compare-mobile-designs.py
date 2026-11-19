"""Compare the mobile playtest captures with the corresponding phone panels in the design PDFs."""

import argparse
import json
from pathlib import Path

import pymupdf
from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
QUILT = '拼布工坊.pdf'
TOY = '玩具修理所.pdf'
QUILT_SCREEN = (752, 193, 980, 649)
TOY_SCREEN = (691, 149, 934, 617)

# PDF points are measured on the printed phone screen, excluding the device and OS chrome.
SCREENS = {
    'quilt-home': (QUILT, 1, QUILT_SCREEN, {
        'art': (770, 252, 960, 393), 'action': (775, 431, 958, 464), 'dock': (753, 597, 979, 647)}),
    'quilt-board': (QUILT, 2, (749, 162, 1001, 683), {
        'board': (753, 229, 998, 485), 'title': (768, 495, 980, 576)}),
    'quilt-finish': (QUILT, 6, QUILT_SCREEN, {
        'art': (779, 257, 954, 423), 'score': (775, 439, 958, 493)}),
    'quilt-work': (QUILT, 7, QUILT_SCREEN, {'art': (766, 294, 966, 497)}),
    'quilt-sail': (QUILT, 8, (748, 162, 1000, 671), {
        'board': (756, 272, 997, 518), 'title': (771, 228, 979, 261)}),
    'quilt-loom': (QUILT, 15, (69, 131, 264, 477), {
        'board': (71, 186, 260, 370), 'needle': (74, 391, 131, 452), 'undo': (202, 391, 259, 452)}),
    'toy-counter': (TOY, 1, TOY_SCREEN, {
        'art': (704, 248, 926, 435), 'action': (704, 487, 920, 524), 'dock': (694, 553, 932, 615)}),
    'toy-stitch': (TOY, 3, TOY_SCREEN, {
        'board': (700, 237, 922, 459), 'tools': (692, 466, 933, 554)}),
    'toy-book': (TOY, 12, TOY_SCREEN, {
        'records': (698, 236, 931, 530), 'dock': (694, 552, 932, 615)}),
    'toy-delivery': (TOY, 13, TOY_SCREEN, {
        'art': (709, 282, 922, 439), 'action': (708, 490, 917, 524), 'dock': (694, 550, 932, 615)}),
}

TITLES = {
    'quilt-home': '拼布工坊 · 图样册', 'quilt-board': '风起时 · 三阶拼图',
    'quilt-finish': '风起时 · 完成结算', 'quilt-work': '作品册 · 风筝详情',
    'quilt-sail': '蓝湾帆影 · 四阶拼图', 'quilt-loom': '工坊布标 · 数织',
    'toy-counter': '玩具修理所 · 接单', 'toy-stitch': '维修室 · 小熊缝针',
    'toy-book': '维修手册 · 修复记录', 'toy-delivery': '发条小车 · 试修交付',
}

PANEL_WIDTH, PANEL_HEIGHT, ROW_HEIGHT = 208, 444, 513


def find_capture(folder, filename):
    matches = list(folder.rglob(filename))
    if len(matches) != 1:
        raise ValueError(f'Expected one {filename} under {folder}, found {len(matches)}')
    return matches[0]


def render_panel(filename, page, rect):
    with pymupdf.open(ROOT / 'designs' / filename) as pdf:
        pixels = pdf[page - 1].get_pixmap(matrix=pymupdf.Matrix(2, 2), clip=pymupdf.Rect(rect), alpha=False)
        return Image.frombytes('RGB', (pixels.width, pixels.height), pixels.samples)


def normalized(rect, origin):
    x, y, right, bottom = rect
    left, top, end_x, end_y = origin
    return ((x-left)/(end_x-left), (y-top)/(end_y-top), (right-x)/(end_x-left), (bottom-y)/(end_y-top))


def sky_coverage(image):
    small = image.resize((100, 160)).convert('RGB')
    samples = [small.getpixel((x, y)) for x in (3, 4, 5, 94, 95, 96) for y in range(16, 142)]
    return sum(b > r + 10 and g > r + 5 and b > g - 12 for r, g, b in samples) / len(samples)


def blue_around_lens(image, bounds):
    x, y, width, height = bounds
    corners = (.03, .06, .09, .91, .94, .97)
    samples = [image.getpixel((round((x + u*width) * image.width), round((y + v*height) * image.height)))
               for u in corners for v in corners]
    return sum(b > r + 10 and g > r + 5 for r, g, b in samples) / len(samples)


def add_row(frames, sheet, row_index, name, page):
    x = row_index % 2 * (len(frames) * PANEL_WIDTH + 24)
    y = row_index // 2 * ROW_HEIGHT
    draw = ImageDraw.Draw(sheet)
    cjk = next((p for p in (Path('/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc'),
                            Path('/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc')) if p.exists()), None)
    if cjk:
        title, labels = f'{TITLES[name]}　·　PDF 第 {page} 页', ['设计图手机画面', '修订前实玩', '本次实玩']
    else:
        title, labels = f'{name}   |   PDF p.{page}', ['Design reference', 'Previous release', 'Current playtest']
    heading = ImageFont.truetype(str(cjk), 17) if cjk else ImageFont.load_default(size=17)
    caption = ImageFont.truetype(str(cjk), 13) if cjk else ImageFont.load_default(size=13)
    draw.text((x + 10, y + 7), title, fill='#172e3e', font=heading)
    if len(frames) == 2:
        labels.pop(1)
    for i, (frame, label) in enumerate(zip(frames, labels)):
        left = x + 10 + i * PANEL_WIDTH
        draw.text((left, y + 35), label, fill='#51636e', font=caption)
        preview = frame.copy()
        preview.thumbnail((PANEL_WIDTH - 6, PANEL_HEIGHT), Image.Resampling.LANCZOS)
        sheet.paste(preview, (left + (PANEL_WIDTH - 6 - preview.width)//2, y + 58))


def verify_thread(captures):
    results = []
    for before in sorted(captures.rglob('bear-open.png')):
        after = before.with_name('bear-closed.png')
        with Image.open(before) as src, Image.open(after) as dst:
            original = src.convert('RGB').resize((622, 622))
            sewn = dst.convert('RGB').resize((622, 622))
        hits = []
        for x, y in [(311, 229), (320, 273), (326, 320), (330, 368), (334, 413)]:
            crossing = 0
            for px in range(x-9, x+10):
                for py in range(y-10, y+11):
                    r, g, b = sewn.getpixel((px, py))
                    prev = original.getpixel((px, py))
                    if r >= 185 and g >= 160 and b >= 105 and g - prev[1] >= 26 and b - prev[2] >= 25:
                        crossing += 1
            hits.append(crossing)
        results.append({'capture': before.parent.name, 'cream_thread_pixels_per_crossing': hits})
    return results


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--captures', type=Path, default=ROOT / 'test-results')
    parser.add_argument('--output', type=Path, default=ROOT / 'test-results' / 'design-review')
    parser.add_argument('--before', type=Path, help='Optional screenshots of the previous version, named design-<scene>.png')
    parser.add_argument('--sheet', type=Path, help='Write an additional copy of the comparison sheet')
    args = parser.parse_args()
    args.output.mkdir(parents=True, exist_ok=True)
    columns = 3 if args.before else 2
    sheet = Image.new('RGB', (2*(columns*PANEL_WIDTH+24), ((len(SCREENS)+1)//2)*ROW_HEIGHT), '#f5f3ec')
    report = {}
    errors = []
    for index, (name, (pdf, page, area, marks)) in enumerate(SCREENS.items()):
        reference = render_panel(pdf, page, area)
        with Image.open(find_capture(args.captures, f'design-{name}.png')) as capture:
            screen = capture.convert('RGB')
        layout = json.loads(find_capture(args.captures, f'design-{name}.json').read_text())
        width, height = layout['viewport']['width'], layout['viewport']['height']
        assert screen.size == (width, height), (name, screen.size, width, height)
        measured = {}
        for landmark, ref in marks.items():
            rx, ry, rw, rh = normalized(ref, area)
            box = layout['elements'][landmark]
            x, y, w, h = box['x']/width, box['y']/height, box['width']/width, box['height']/height
            delta = {'center_x': abs(x+w/2-rx-rw/2), 'top': abs(y-ry), 'width': abs(w-rw)}
            if landmark in ('art', 'board'):
                delta['height'] = abs(h-rh)
            limits = {'center_x': .12, 'top': .13, 'width': .17, 'height': .16}
            for key, value in delta.items():
                if value > limits[key]:
                    errors.append(f'{name}/{landmark}/{key}: {value:.3f} of viewport (limit {limits[key]})')
            measured[landmark] = {k: round(v, 3) for k, v in delta.items()}
        ref_blue = sky_coverage(reference)
        observed_blue = sky_coverage(screen)
        if observed_blue < min(.18, ref_blue * .45):
            errors.append(f'{name}: blue textile/sky background missing at the page edges')
        report[name] = {'pdf': pdf, 'page': page, 'phone_in_pdf_points': area, 'viewport': layout['viewport'],
                        'layout_deltas': measured, 'reference_blue': round(ref_blue, 2), 'observed_blue': round(observed_blue, 2)}
        if name == 'toy-stitch':
            board = layout['elements']['board']
            actual = (board['x']/width, board['y']/height, board['width']/width, board['height']/height)
            reference_corners = blue_around_lens(reference, normalized(marks['board'], area))
            play_corners = blue_around_lens(screen, actual)
            report[name]['blue_around_circular_lens'] = [round(reference_corners, 2), round(play_corners, 2)]
            if play_corners < reference_corners - .2:
                errors.append('toy-stitch: the blue background should be visible around all four corners of the circular loupe')
        frames = [reference, screen]
        if args.before:
            with Image.open(find_capture(args.before, f'design-{name}.png')) as old:
                frames = [reference, old.convert('RGB'), screen]
        add_row(frames, sheet, index, name, page)
    thread = verify_thread(args.captures)
    device_names = {entry['capture'].rsplit('-', 1)[-1] for entry in thread}
    if device_names != {'desktop', 'mobile'} or any(min(entry['cream_thread_pixels_per_crossing']) < 12 for entry in thread):
        errors.append('Five visible thread crossings were not detected on every captured teddy arm')
    report['bear_seam'] = thread
    report['errors'] = errors
    (args.output/'metrics.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
    sheet.save(args.output/'mobile-design.webp', quality=88)
    if args.sheet:
        sheet.save(args.sheet, quality=88)
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return bool(errors)


if __name__ == '__main__':
    raise SystemExit(main())
