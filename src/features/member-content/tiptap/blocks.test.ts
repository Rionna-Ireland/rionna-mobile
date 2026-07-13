import {
  CIRCLE_DOWNCONVERT,
  circleNodeTypes,
  isAuthorable,
  isCircleNode,
  resolveViaFor,
} from './blocks';

describe('circle block registry', () => {
  it('describes Circle nodes independently from editor-only nodes', () => {
    const nodes = circleNodeTypes();

    expect([...nodes].sort()).toEqual([
      'blockquote',
      'bulletList',
      'codeBlock',
      'doc',
      'embed',
      'entity',
      'file',
      'hardBreak',
      'heading',
      'horizontalRule',
      'image',
      'listItem',
      'mention',
      'orderedList',
      'paragraph',
      'poll',
      'text',
    ]);
    expect(nodes.has('taskList')).toBe(false);
  });

  it('keeps resolution and authoring metadata aligned with the web contract', () => {
    expect(resolveViaFor('poll')).toBe('sgid');
    expect(resolveViaFor('embed')).toBe('sgid');
    expect(resolveViaFor('image')).toBe('inlineAttachment');
    expect(resolveViaFor('paragraph')).toBeNull();
    expect(isAuthorable('poll')).toBe(false);
    expect(isAuthorable('paragraph')).toBe(true);
    expect(isCircleNode('heading')).toBe(true);
    expect(isCircleNode('bold')).toBe(false);
    expect(CIRCLE_DOWNCONVERT).toEqual({
      taskItem: 'listItem',
      taskList: 'bulletList',
    });
  });
});
