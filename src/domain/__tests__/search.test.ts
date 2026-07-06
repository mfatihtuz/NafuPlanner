import { filterTasksByQuery } from '../search';
import type { Task } from '../types';

function task(partial: Partial<Task> & { title: string }): Task {
  return {
    id: 't',
    householdId: 'h',
    priority: 'medium',
    status: 'open',
    hasTime: false,
    assigneeIds: [],
    subtasks: [],
    points: 10,
    attachmentsCount: 0,
    commentsCount: 0,
    createdBy: 'u',
    createdAtMs: 0,
    ...partial,
  };
}

describe('filterTasksByQuery', () => {
  const tasks = [
    task({ title: 'Çöpü çıkar' }),
    task({ title: 'Market', description: 'Süt ve ekmek' }),
    task({ title: 'Faturalar' }),
  ];

  it('boş sorguda hepsini döndürür', () => {
    expect(filterTasksByQuery(tasks, '')).toHaveLength(3);
    expect(filterTasksByQuery(tasks, '   ')).toHaveLength(3);
  });

  it('başlıkta büyük/küçük harf duyarsız arar (Türkçe)', () => {
    expect(filterTasksByQuery(tasks, 'market')).toHaveLength(1);
    expect(filterTasksByQuery(tasks, 'ÇÖP')).toHaveLength(1);
  });

  it('açıklamada da arar', () => {
    expect(filterTasksByQuery(tasks, 'ekmek')).toHaveLength(1);
  });

  it('eşleşme yoksa boş döner', () => {
    expect(filterTasksByQuery(tasks, 'xyz')).toHaveLength(0);
  });
});
