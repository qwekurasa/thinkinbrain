export const day = 86_400_000;
export const pinPrice = 12;
export const completionReward = 5;
export const storageKey = 'thinkinbrain.notebook.v2';

export function emptyState() {
  return { cover:null, ideas:[], balance:0, lastSeen:null, palette:'white', avatar:null,
    finishes:['classic'], pupils:['round'], draft:{text:'', bloom:null} };
}

export function sectionOf(idea) {
  return idea.completedAt ? 'completed' : idea.archivedAt ? 'archived' : 'active';
}

export function resume(state, now) {
  if (state.lastSeen && now - state.lastSeen >= 7 * day) {
    for (const item of state.ideas) {
      if (sectionOf(item) === 'active' && !(item.pinnedUntil > now)) item.archivedAt = now;
    }
  }
  state.lastSeen = now;
}

export function saveIdea(state, editing, words, bloom, now, uuid) {
  const text = words.trim();
  if (!text) return null;
  const prior = state.ideas.find(idea => idea.id === editing);
  const size = Array.from(text).length;
  const score = Math.max(prior?.award || 0, 1 + Number(size >= 80) + Number(size >= 200));
  state.balance += score - (prior?.award || 0);
  if (prior) {
    Object.assign(prior, {text, bloom, award:score});
    return prior;
  }
  const idea = {id:uuid, text, bloom, created:now, award:score, additions:[]};
  state.ideas.unshift(idea);
  state.draft = {text:'',bloom:null};
  return idea;
}

export function changeIdea(state, id, action, now) {
  const item = state.ideas.find(idea => idea.id === id);
  if (!item) return false;
  const section = sectionOf(item);
  if (action === 'complete' && section === 'active') {
    item.completedAt = now;
    state.balance += completionReward;
  } else if (action === 'pin' && section === 'active' && !(item.pinnedUntil > now) && state.balance >= pinPrice) {
    item.pinnedUntil = now + 30 * day;
    state.balance -= pinPrice;
  } else if (action === 'restore' && section === 'archived') {
    item.archivedAt = null;
  } else if (action === 'bookmark') {
    item.bookmarked = !item.bookmarked;
  } else {
    return false;
  }
  return true;
}
