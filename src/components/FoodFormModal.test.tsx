import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { FoodFormModal } from './FoodFormModal';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function deferred() {
  let resolve!: () => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<void>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function setup(onSave: () => Promise<void>) {
  render(<FoodFormModal onSave={onSave} onClose={() => {}} />);
  fireEvent.change(screen.getByPlaceholderText('例：牛乳'), { target: { value: '牛乳' } });
  return screen.getByRole('button', { name: '保存' }) as HTMLButtonElement;
}

describe('FoodFormModal の送信', () => {
  it('保存を 2 回送信しても onSave は 1 回だけ呼ばれる', async () => {
    const d = deferred();
    const onSave = vi.fn(() => d.promise);
    const button = setup(onSave);
    const form = button.closest('form') as HTMLFormElement;

    // ボタンの click だと 1 回目の後に disabled になって 2 回目が届かず、
    // submittingRef のガードを通らない。form の submit を直接 2 回送る
    fireEvent.submit(form);
    fireEvent.submit(form);
    expect(onSave).toHaveBeenCalledTimes(1);

    await act(async () => d.resolve());
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it('onSave が reject したらエラー文言が表示される', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const onSave = vi.fn().mockRejectedValue(new Error('シートに書き込めませんでした'));
    const button = setup(onSave);

    await act(async () => {
      fireEvent.click(button);
    });

    expect(screen.getByRole('alert').textContent).toBe('シートに書き込めませんでした');
    expect(button.disabled).toBe(false);
  });

  it('送信中は保存ボタンが disabled で、完了後に解除される', async () => {
    const d = deferred();
    const button = setup(() => d.promise);
    expect(button.disabled).toBe(false);

    fireEvent.click(button);
    expect(button.disabled).toBe(true);

    await act(async () => d.resolve());
    expect(button.disabled).toBe(false);
  });
});
