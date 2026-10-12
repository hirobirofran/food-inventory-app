// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { FoodFormModal } from './FoodFormModal';

const deferred = () => Promise.withResolvers<void>();

function setup(onSave: () => Promise<void>) {
  render(<FoodFormModal onSave={onSave} onClose={() => {}} />);
  fireEvent.change(screen.getByPlaceholderText('例：牛乳'), { target: { value: '牛乳' } });
  const button = screen.getByRole<HTMLButtonElement>('button', { name: '保存' });
  const form = button.form;
  if (!form) throw new Error('保存ボタンが form に属していない');
  return { button, form };
}

describe('FoodFormModal の送信', () => {
  it('保存を 2 回送信しても onSave は 1 回だけ呼ばれ、完了後は再送信できる', async () => {
    const d = deferred();
    const onSave = vi.fn(() => d.promise);
    const { form } = setup(onSave);

    // ボタンの click だと 1 回目の後に disabled になって 2 回目が届かず、
    // submittingRef のガードを通らない。form の submit を直接 2 回送る
    fireEvent.submit(form);
    fireEvent.submit(form);
    expect(onSave).toHaveBeenCalledTimes(1);

    await act(async () => d.resolve());
    expect(onSave).toHaveBeenCalledTimes(1);

    // ガードは一時的：完了後は次の送信が通る
    fireEvent.submit(form);
    expect(onSave).toHaveBeenCalledTimes(2);
  });

  it.each([
    ['Error', new Error('シートに書き込めませんでした'), 'シートに書き込めませんでした'],
    ['非 Error（文字列）', 'boom', '保存に失敗しました'],
  ])('onSave が %s で reject したらエラー文言が表示され、再送信できる', async (_name, reason, message) => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const onSave = vi.fn().mockRejectedValue(reason);
    const { button, form } = setup(onSave);

    await act(async () => {
      fireEvent.click(button);
    });

    expect(screen.getByRole('alert').textContent).toBe(message);
    expect(button.disabled).toBe(false);
    expect(errorSpy).toHaveBeenCalledTimes(1);
    expect(errorSpy).toHaveBeenCalledWith(reason);

    // 失敗後もガードが解除されている
    await act(async () => {
      fireEvent.submit(form);
    });
    expect(onSave).toHaveBeenCalledTimes(2);
  });

  it('送信中は保存・キャンセル・×が disabled で、完了後に解除される', async () => {
    const d = deferred();
    const { button } = setup(() => d.promise);
    const cancel = screen.getByRole<HTMLButtonElement>('button', { name: 'キャンセル' });
    const close = screen.getByRole<HTMLButtonElement>('button', { name: '×' });
    expect(button.disabled).toBe(false);
    expect(cancel.disabled).toBe(false);
    expect(close.disabled).toBe(false);

    fireEvent.click(button);
    expect(button.disabled).toBe(true);
    expect(cancel.disabled).toBe(true);
    expect(close.disabled).toBe(true);

    await act(async () => d.resolve());
    expect(button.disabled).toBe(false);
    expect(cancel.disabled).toBe(false);
    expect(close.disabled).toBe(false);
  });
});
