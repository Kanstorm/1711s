import { supabase } from "./supabaseClient";

async function q(table, options = {}) {
  let query = supabase.from(table).select("*");
  if (options.order) query = query.order(options.order, { ascending: options.asc ?? true });
  const { data, error } = await query;
  if (error) console.warn(`Query failed for ${table}:`, error.message);
  return data || [];
}

export async function loadAllData() {
  console.log("loadAllData: fetching from Supabase...");
  const [books, profiles, readingProgress, reviews, threads, posts, recommendations, activities, friendships, friendRequests, customSeals, customTriumphs, completedSeals, triumphProgress, groupChallenges, groupReads, groupReadMembers, groupReadMessages, bibleProgress, reviewLikes] = await Promise.all([
    q("books", { order: "created_at" }),
    q("profiles"),
    q("reading_progress"),
    q("reviews", { order: "created_at", asc: false }),
    q("threads", { order: "created_at", asc: false }),
    q("posts", { order: "created_at" }),
    q("recommendations", { order: "created_at", asc: false }),
    q("activities", { order: "created_at", asc: false }),
    q("friendships"),
    q("friend_requests"),
    q("custom_seals"),
    q("custom_triumphs"),
    q("completed_seals"),
    q("triumph_progress"),
    q("group_challenges"),
    q("group_reads"),
    q("group_read_members"),
    q("group_read_messages", { order: "created_at" }),
    q("bible_progress"),
    q("review_likes"),
  ]);
  console.log("loadAllData: all queries complete.", { books: books.length, profiles: profiles.length });

  // Members from profiles
  const membersArr = profiles.map(p => ({ id: p.id, name: p.display_name, avatar: p.avatar, tag: p.tag, admin: p.is_admin, joinDate: p.created_at?.split("T")[0] || "" }));
  // Books
  const booksArr = books.map(b => ({ id: b.id, title: b.title, author: b.author, category: b.category, pages: b.pages, cover: "", coverUrl: b.cover_url || "" }));
  // Reading progress
  const rpObj = {}; readingProgress.forEach(rp => { if (!rpObj[rp.user_id]) rpObj[rp.user_id] = {}; rpObj[rp.user_id][rp.book_id] = rp.pages_read; });
  // Reviews
  const reviewsArr = reviews.map(r => ({ id: r.id, bookId: r.book_id, memberId: r.user_id, rating: r.rating, text: r.body, date: r.created_at?.split("T")[0] || "" }));
  // Review likes: { reviewId: [userId, userId, ...] }
  const reviewLikesObj = {}; reviewLikes.forEach(rl => { if (!reviewLikesObj[rl.review_id]) reviewLikesObj[rl.review_id] = []; reviewLikesObj[rl.review_id].push(rl.user_id); });
  // Threads + posts
  const postsMap = {}; posts.forEach(p => { if (!postsMap[p.thread_id]) postsMap[p.thread_id] = []; postsMap[p.thread_id].push({ id: p.id, authorId: p.author_id, text: p.body, date: p.created_at?.split("T")[0] || "" }); });
  const threadsArr = threads.map(t => ({ id: t.id, title: t.title, category: t.category, authorId: t.author_id, bookId: t.book_id, date: t.created_at?.split("T")[0] || "", posts: postsMap[t.id] || [] }));
  // Recommendations
  const recsArr = recommendations.map(r => ({ id: r.id, bookId: r.book_id, memberId: r.user_id, note: r.note || "", date: r.created_at?.split("T")[0] || "" }));
  // Activities
  const activitiesArr = activities.map(a => ({ id: a.id, type: a.activity_type, memberId: a.user_id, text: a.description, icon: a.icon, date: a.created_at?.split("T")[0] || "" }));
  // Friends
  const friendsObj = {}; friendships.forEach(f => { if (!friendsObj[f.user_id]) friendsObj[f.user_id] = []; if (!friendsObj[f.user_id].includes(f.friend_id)) friendsObj[f.user_id].push(f.friend_id); });
  // Friend requests
  const frArr = friendRequests.map(fr => ({ id: fr.id, fromId: fr.from_id, toId: fr.to_id, date: fr.created_at?.split("T")[0] || "", status: fr.status }));
  // Custom seals + triumphs
  const triumphsBySeal = {}; customTriumphs.forEach(t => { if (!triumphsBySeal[t.seal_id]) triumphsBySeal[t.seal_id] = []; triumphsBySeal[t.seal_id].push({ id: t.id, name: t.name, desc: t.description || "", type: t.triumph_type, target: t.target }); });
  const customSealsArr = customSeals.map(s => ({ id: s.id, name: s.name, subtitle: s.subtitle || "", description: s.description || "", icon: s.icon, color: s.color, triumphs: triumphsBySeal[s.id] || [] }));
  // Completed seals
  const completedSealsObj = {}; completedSeals.forEach(cs => { if (!completedSealsObj[cs.user_id]) completedSealsObj[cs.user_id] = []; completedSealsObj[cs.user_id].push(cs.seal_id); });
  // Triumph progress
  const tpObj = {}; triumphProgress.forEach(tp => { if (!tpObj[tp.user_id]) tpObj[tp.user_id] = {}; tpObj[tp.user_id][tp.triumph_id] = tp.progress; });
  // Group challenges
  const gcArr = groupChallenges.map(gc => ({ id: gc.id, name: gc.name, description: gc.description || "", target: gc.target, type: gc.challenge_type, year: gc.year, active: gc.is_active }));
  // Group reads
  const grMembersMap = {}; groupReadMembers.forEach(m => { if (!grMembersMap[m.group_read_id]) grMembersMap[m.group_read_id] = []; grMembersMap[m.group_read_id].push(m); });
  const grMessagesMap = {}; groupReadMessages.forEach(m => { if (!grMessagesMap[m.group_read_id]) grMessagesMap[m.group_read_id] = []; grMessagesMap[m.group_read_id].push({ id: m.id, authorId: m.author_id, text: m.body, date: m.created_at?.split("T")[0] || "", time: m.created_at ? new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "" }); });
  const readInvitesArr = groupReads.map(gr => { const members = grMembersMap[gr.id] || []; return { id: gr.id, bookId: gr.book_id, fromId: gr.from_id, invitedIds: members.filter(m => m.status === "invited").map(m => m.user_id), acceptedIds: members.filter(m => m.status === "accepted").map(m => m.user_id), declinedIds: members.filter(m => m.status === "declined").map(m => m.user_id), note: gr.note || "", messages: grMessagesMap[gr.id] || [], date: gr.created_at?.split("T")[0] || "", status: gr.status }; });
  // Bible progress
  const bpObj = {}; bibleProgress.forEach(bp => { if (!bpObj[bp.user_id]) bpObj[bp.user_id] = {}; if (!bpObj[bp.user_id][bp.book_name]) bpObj[bp.user_id][bp.book_name] = []; bpObj[bp.user_id][bp.book_name].push(bp.chapter); }); Object.values(bpObj).forEach(userBp => { Object.keys(userBp).forEach(bn => userBp[bn].sort((a, b) => a - b)); });
  // Profile fields
  const displayNamesObj = {}, equippedTitlesObj = {}, prestigeObj = {};
  profiles.forEach(p => { displayNamesObj[p.id] = p.display_name; if (p.equipped_title) equippedTitlesObj[p.id] = p.equipped_title; if (p.prestige_level > 0) prestigeObj[p.id] = p.prestige_level; });
  const pinnedThreadIds = threads.filter(t => t.is_pinned).map(t => t.id);

  return { members: membersArr, books: booksArr, readingProgress: rpObj, reviews: reviewsArr, threads: threadsArr, recommendations: recsArr, activities: activitiesArr, equippedTitles: equippedTitlesObj, completedSeals: completedSealsObj, triumphProgress: tpObj, groupChallenges: gcArr, readInvites: readInvitesArr, bibleProgress: bpObj, prestigeLevel: prestigeObj, customSeals: customSealsArr, pinnedThreads: pinnedThreadIds, displayNames: displayNamesObj, friendRequests: frArr, friends: friendsObj, reviewLikes: reviewLikesObj };
}

// Sync: diff old→new, write changes to Supabase
export async function syncChanges(oldData, newData) {
  if (!oldData || !newData) return;
  const p = [];
  try {
    // Books additions
    const oldBkIds = new Set(oldData.books.map(b => b.id));
    for (const b of newData.books) { if (!oldBkIds.has(b.id)) p.push(supabase.from("books").insert({ title: b.title, author: b.author, category: b.category, pages: b.pages, cover_url: b.coverUrl || null }).select().single().then(({ data: s }) => { if (s) b.id = s.id; })); }
    // Reading progress
    for (const uid of Object.keys(newData.readingProgress || {})) { const o = oldData.readingProgress?.[uid] || {}, n = newData.readingProgress[uid] || {}; for (const bid of Object.keys(n)) { if (n[bid] !== o[bid]) p.push(supabase.from("reading_progress").upsert({ user_id: uid, book_id: bid, pages_read: n[bid], updated_at: new Date().toISOString() })); } }
    // Reviews add/delete
    const oldRvIds = new Set(oldData.reviews.map(r => r.id)), newRvIds = new Set(newData.reviews.map(r => r.id));
    for (const r of newData.reviews) { if (!oldRvIds.has(r.id)) p.push(supabase.from("reviews").insert({ user_id: r.memberId, book_id: r.bookId, rating: r.rating, body: r.text }).select().single().then(({ data: s }) => { if (s) r.id = s.id; })); }
    for (const r of oldData.reviews) { if (!newRvIds.has(r.id)) p.push(supabase.from("reviews").delete().eq("id", r.id)); }
    // Threads add/delete + posts
    const oldThIds = new Set(oldData.threads.map(t => t.id)), newThIds = new Set(newData.threads.map(t => t.id));
    for (const t of newData.threads) {
      if (!oldThIds.has(t.id)) {
        p.push(supabase.from("threads").insert({ title: t.title, category: t.category, author_id: t.authorId, book_id: t.bookId || null }).select().single().then(async ({ data: s }) => { if (s) { t.id = s.id; for (const po of t.posts) { const { data: sp } = await supabase.from("posts").insert({ thread_id: s.id, author_id: po.authorId, body: po.text }).select().single(); if (sp) po.id = sp.id; } } }));
      } else {
        const ot = oldData.threads.find(x => x.id === t.id);
        if (ot) { const opIds = new Set(ot.posts.map(x => x.id)), npIds = new Set(t.posts.map(x => x.id)); for (const po of t.posts) { if (!opIds.has(po.id)) p.push(supabase.from("posts").insert({ thread_id: t.id, author_id: po.authorId, body: po.text }).select().single().then(({ data: s }) => { if (s) po.id = s.id; })); } for (const po of ot.posts) { if (!npIds.has(po.id)) p.push(supabase.from("posts").delete().eq("id", po.id)); } }
      }
    }
    for (const t of oldData.threads) { if (!newThIds.has(t.id)) p.push(supabase.from("threads").delete().eq("id", t.id)); }
    // Pinned
    const oPin = new Set(oldData.pinnedThreads || []), nPin = new Set(newData.pinnedThreads || []);
    for (const id of nPin) { if (!oPin.has(id)) p.push(supabase.from("threads").update({ is_pinned: true }).eq("id", id)); }
    for (const id of oPin) { if (!nPin.has(id)) p.push(supabase.from("threads").update({ is_pinned: false }).eq("id", id)); }
    // Recommendations
    const oldRecIds = new Set(oldData.recommendations.map(r => r.id));
    for (const r of newData.recommendations) { if (!oldRecIds.has(r.id)) p.push(supabase.from("recommendations").insert({ user_id: r.memberId, book_id: r.bookId, note: r.note || null }).select().single().then(({ data: s }) => { if (s) r.id = s.id; })); }
    // Activities
    const oldActIds = new Set(oldData.activities.map(a => a.id));
    for (const a of newData.activities) { if (!oldActIds.has(a.id)) p.push(supabase.from("activities").insert({ user_id: a.memberId, activity_type: a.type, description: a.text, icon: a.icon || "★" }).select().single().then(({ data: s }) => { if (s) a.id = s.id; })); }
    // Friends
    for (const uid of Object.keys(newData.friends || {})) { const of2 = new Set(oldData.friends?.[uid] || []); for (const fid of (newData.friends[uid] || [])) { if (!of2.has(fid)) p.push(supabase.from("friendships").upsert([{ user_id: uid, friend_id: fid }, { user_id: fid, friend_id: uid }])); } }
    for (const uid of Object.keys(oldData.friends || {})) { const nf = new Set(newData.friends?.[uid] || []); for (const fid of (oldData.friends[uid] || [])) { if (!nf.has(fid)) p.push(supabase.from("friendships").delete().eq("user_id", uid).eq("friend_id", fid)); } }
    // Friend requests
    const oldFrMap = new Map(oldData.friendRequests.map(fr => [fr.id, fr])), newFrIds2 = new Set(newData.friendRequests.map(fr => fr.id));
    for (const fr of newData.friendRequests) { const old = oldFrMap.get(fr.id); if (!old) p.push(supabase.from("friend_requests").insert({ from_id: fr.fromId, to_id: fr.toId }).select().single().then(({ data: s }) => { if (s) fr.id = s.id; })); else if (old.status !== fr.status) p.push(supabase.from("friend_requests").update({ status: fr.status }).eq("id", fr.id)); }
    for (const fr of oldData.friendRequests) { if (!newFrIds2.has(fr.id)) p.push(supabase.from("friend_requests").delete().eq("id", fr.id)); }
    // Custom seals
    const oldSIds = new Set(oldData.customSeals.map(s => s.id)), newSIds = new Set(newData.customSeals.map(s => s.id));
    for (const s of newData.customSeals) {
      if (!oldSIds.has(s.id)) {
        p.push(supabase.from("custom_seals").insert({ name: s.name, subtitle: s.subtitle, description: s.description, icon: s.icon, color: s.color }).select().single().then(async ({ data: sv }) => { if (sv) { s.id = sv.id; for (const t of s.triumphs) { const { data: st } = await supabase.from("custom_triumphs").insert({ seal_id: sv.id, name: t.name, description: t.desc, triumph_type: t.type, target: t.target }).select().single(); if (st) t.id = st.id; } } }));
      } else {
        const os = oldData.customSeals.find(x => x.id === s.id);
        if (os && (os.name !== s.name || os.subtitle !== s.subtitle || os.description !== s.description || os.icon !== s.icon || os.color !== s.color)) p.push(supabase.from("custom_seals").update({ name: s.name, subtitle: s.subtitle, description: s.description, icon: s.icon, color: s.color }).eq("id", s.id));
        if (os) { const otIds = new Set(os.triumphs.map(t => t.id)), ntIds = new Set(s.triumphs.map(t => t.id)); for (const t of s.triumphs) { if (!otIds.has(t.id)) p.push(supabase.from("custom_triumphs").insert({ seal_id: s.id, name: t.name, description: t.desc, triumph_type: t.type, target: t.target }).select().single().then(({ data: sv }) => { if (sv) t.id = sv.id; })); else { const ot = os.triumphs.find(x => x.id === t.id); if (ot && (ot.name !== t.name || ot.desc !== t.desc || ot.target !== t.target)) p.push(supabase.from("custom_triumphs").update({ name: t.name, description: t.desc, triumph_type: t.type, target: t.target }).eq("id", t.id)); } } for (const t of os.triumphs) { if (!ntIds.has(t.id)) p.push(supabase.from("custom_triumphs").delete().eq("id", t.id)); } }
      }
    }
    for (const s of oldData.customSeals) { if (!newSIds.has(s.id)) p.push(supabase.from("custom_seals").delete().eq("id", s.id)); }
    // Completed seals
    for (const uid of Object.keys(newData.completedSeals || {})) { const os2 = new Set(oldData.completedSeals?.[uid] || []); for (const sid of newData.completedSeals[uid]) { if (!os2.has(sid)) p.push(supabase.from("completed_seals").upsert({ user_id: uid, seal_id: sid })); } }
    // Triumph progress
    for (const uid of Object.keys(newData.triumphProgress || {})) { const ot2 = oldData.triumphProgress?.[uid] || {}, nt2 = newData.triumphProgress[uid] || {}; for (const tid of Object.keys(nt2)) { if (nt2[tid] !== ot2[tid]) p.push(supabase.from("triumph_progress").upsert({ user_id: uid, triumph_id: tid, progress: nt2[tid], updated_at: new Date().toISOString() })); } }
    // Group challenges
    const oldGcIds = new Set(oldData.groupChallenges.map(g => g.id)), newGcIds = new Set(newData.groupChallenges.map(g => g.id));
    for (const gc of newData.groupChallenges) { if (!oldGcIds.has(gc.id)) p.push(supabase.from("group_challenges").insert({ name: gc.name, description: gc.description, target: gc.target, challenge_type: gc.type, year: gc.year, is_active: gc.active !== false }).select().single().then(({ data: s }) => { if (s) gc.id = s.id; })); else { const og = oldData.groupChallenges.find(x => x.id === gc.id); if (og && JSON.stringify(og) !== JSON.stringify(gc)) p.push(supabase.from("group_challenges").update({ name: gc.name, description: gc.description, target: gc.target, challenge_type: gc.type, year: gc.year, is_active: gc.active !== false }).eq("id", gc.id)); } }
    for (const gc of oldData.groupChallenges) { if (!newGcIds.has(gc.id)) p.push(supabase.from("group_challenges").delete().eq("id", gc.id)); }
    // Group reads
    const oldInvIds = new Set(oldData.readInvites.map(i => i.id));
    for (const inv of newData.readInvites) {
      if (!oldInvIds.has(inv.id)) { p.push(supabase.from("group_reads").insert({ book_id: inv.bookId, from_id: inv.fromId, note: inv.note || null }).select().single().then(async ({ data: s }) => { if (s) { inv.id = s.id; if (inv.invitedIds?.length) await supabase.from("group_read_members").insert(inv.invitedIds.map(uid => ({ group_read_id: s.id, user_id: uid, status: "invited" }))); } })); }
      else { const oi = oldData.readInvites.find(x => x.id === inv.id); if (oi) { for (const uid of inv.acceptedIds) { if (!oi.acceptedIds.includes(uid)) p.push(supabase.from("group_read_members").update({ status: "accepted" }).eq("group_read_id", inv.id).eq("user_id", uid)); } for (const uid of inv.declinedIds) { if (!oi.declinedIds.includes(uid)) p.push(supabase.from("group_read_members").update({ status: "declined" }).eq("group_read_id", inv.id).eq("user_id", uid)); } const omIds = new Set(oi.messages.map(m => m.id)); for (const msg of inv.messages) { if (!omIds.has(msg.id)) p.push(supabase.from("group_read_messages").insert({ group_read_id: inv.id, author_id: msg.authorId, body: msg.text }).select().single().then(({ data: s }) => { if (s) msg.id = s.id; })); } } }
    }
    // Bible progress — handled directly in toggleChapter/markAllChapters/prestige, skip sync
    // Profile fields
    for (const uid of Object.keys(newData.prestigeLevel || {})) { if (newData.prestigeLevel[uid] !== (oldData.prestigeLevel?.[uid] || 0)) p.push(supabase.from("profiles").update({ prestige_level: newData.prestigeLevel[uid] }).eq("id", uid)); }
    for (const uid of Object.keys(newData.displayNames || {})) { if (newData.displayNames[uid] !== oldData.displayNames?.[uid]) p.push(supabase.from("profiles").update({ display_name: newData.displayNames[uid] }).eq("id", uid)); }
    for (const uid of Object.keys(newData.equippedTitles || {})) { if (newData.equippedTitles[uid] !== oldData.equippedTitles?.[uid]) p.push(supabase.from("profiles").update({ equipped_title: newData.equippedTitles[uid] }).eq("id", uid)); }
    await Promise.all(p);
  } catch (err) { console.error("Sync error:", err); }
}