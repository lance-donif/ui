import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import PondGame from './index';

type Player = ReturnType<typeof userEvent.setup>;
const button = (name: string | RegExp) => screen.getByRole('button', { name });
const dialog = (name: string) => screen.getByRole('dialog', { name });

async function openSluice(player: Player) {
  await player.click(button(/风过荷塘/));
  await player.click(button('进入断叶水闸'));
}

async function hop(player: Player, ...coordinates: string[]) {
  for (const target of coordinates) await player.click(button(new RegExp('^' + target + ' ')));
}

function expectBoard(frog: string, steps: number) {
  expect(button(new RegExp('^' + frog + ' .*青蛙所在'))).toBeDefined();
  const stepsStatus = screen.getAllByRole('status').find(item => item.textContent?.startsWith('剩余'));
  expect(stepsStatus?.textContent).toBe('剩余 ' + steps + ' 步');
}

beforeEach(() => window.localStorage.clear());
afterEach(cleanup);

describe('池塘跳跳 user flows', () => {
  it('retains the quickest clear, a later flower stamp, and a favorite across reloads', async () => {
    const player = userEvent.setup();
    const app = render(<PondGame />);
    await openSluice(player);
    await hop(player, 'A3', 'B3', 'B2', 'B1', 'C1');
    expect(within(dialog('抵达小旗！')).getByText('最佳 5 步 · 本局未摘莲花')).toBeDefined();
    await player.click(button('收藏本关'));
    expect(button('取消收藏')).toBeDefined();
    await player.click(button('再玩一次'));
    await hop(player, 'A3', 'B3', 'C3');
    expect(screen.getByRole('img', { name: '随身莲花' })).toBeDefined();
    await player.click(button('暂停游戏'));
    await player.click(button('撤回一步'));
    expect(screen.queryByRole('img', { name: '随身莲花' })).toBeNull();
    expect(button('C3 莲花')).toBeDefined();
    await hop(player, 'C3', 'B3', 'B2', 'B1', 'C1');
    expect(within(dialog('抵达小旗！')).getByText('断叶水闸 · 7 步到旗')).toBeDefined();
    expect(screen.getByText('最佳 5 步 · 本局获得花章')).toBeDefined();

    app.unmount();
    render(<PondGame />);
    await player.click(button('我的'));
    expect(screen.getByText(/最佳 5 步 · 已获花章/)).toBeDefined();
    await player.click(button('收藏'));
    expect(button('进入断叶水闸')).toBeDefined();
    await player.click(button('取消收藏断叶水闸'));
    expect(screen.getByRole('heading', { name: '还没有收藏的关卡' })).toBeDefined();
    await player.click(button('撤销'));
    expect(button('进入断叶水闸')).toBeDefined();
  });

  it('resumes a paused run and restores the two preceding pad states one by one', async () => {
    const player = userEvent.setup();
    const app = render(<PondGame />);
    await openSluice(player);
    await hop(player, 'A3', 'B3', 'C3', 'B3', 'B2', 'B1');
    expectBoard('B1', 1);
    expect(screen.queryByRole('button', { name: /^B2 / })).toBeNull();
    await player.click(button('暂停游戏'));
    await player.click(button('保存并退出'));
    expect(button('继续断叶水闸')).toBeDefined();

    app.unmount();
    render(<PondGame />);
    expectBoard('B1', 1);
    expect(screen.queryByRole('button', { name: /^B2 / })).toBeNull();

    await player.click(button('暂停游戏'));
    await player.click(button('撤回一步'));
    expectBoard('B2', 2);
    expect(button('B2 裂纹荷叶，青蛙所在')).toBeDefined();
    await player.click(button('暂停游戏'));
    await player.click(button('撤回一步'));
    expectBoard('B3', 3);
    expect(button('B2 裂纹荷叶').tabIndex).toBe(0);
    expect(button('C3 荷叶')).toBeDefined();
    expect(button('A3 荷叶')).toBeDefined();
  });

  it('recovers from a stranded pad and an exhausted attempt without recording a win', async () => {
    const player = userEvent.setup();
    render(<PondGame />);
    await openSluice(player);
    await hop(player, 'B2', 'B1');
    expect(dialog('没有可跳的荷叶')).toBeDefined();
    await player.click(button('撤回一步'));
    expectBoard('B2', 6);
    await player.click(button('暂停游戏'));
    await player.click(button('重新开始'));
    await player.click(button('保留当前局'));
    expectBoard('B2', 6);
    await player.click(button('暂停游戏'));
    await player.click(button('重新开始'));
    await player.click(button('确认重新开始'));
    expectBoard('B3', 7);

    await hop(player, 'A3', 'B3', 'C3', 'B3', 'A3', 'B3', 'C3');
    expect(dialog('步数已用尽')).toBeDefined();
    await player.click(button('撤回一步'));
    expectBoard('B3', 1);
    await player.click(button('暂停游戏'));
    await player.click(button('保存并退出'));
    await player.click(button('我的'));
    expect(screen.getByRole('heading', { name: '第一面小旗等着你' })).toBeDefined();
  });
});
