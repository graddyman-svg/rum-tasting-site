
// ==================================================
// ラム酒おすすめ検索
// 香り・風味タグによる推薦
// ==================================================

const $ = (id) => document.getElementById(id);


// --------------------------------------------------
// 1. 推薦機能の設定
// --------------------------------------------------

// 苦手な香り1種類あたりの減点
const DISLIKE_PENALTY = 20;

// 香り・風味の分類
const FLAVOR_TAGS = [
  'バニラ・クリーム',
  '蜂蜜・糖蜜',
  'キャラメル',
  'トロピカルフルーツ',
  '柑橘',
  'その他の果実',
  'ドライフルーツ',
  '樽・木香',
  'スパイス',
  'ハーブ・植物',
  'フローラル',
  'カカオ・焙煎・ナッツ',
  '燻製・うま味',
  '発酵・エステル'
];

// Supabaseから取得した銘柄
let allRums = [];


// --------------------------------------------------
// 2. 香りの選択肢を作成
// --------------------------------------------------

function createTagOptions(containerId, inputName) {

  const container = $(containerId);

  container.replaceChildren();

  for (const tag of FLAVOR_TAGS) {

    const label = el('label', 'flavor-option');

    const input = document.createElement('input');

    input.type = 'checkbox';
    input.name = inputName;
    input.value = tag;

    label.append(
      input,
      document.createTextNode(' ' + tag)
    );

    container.append(label);

    input.addEventListener(
      'change',
      updateTagOptions
    );
  }
}


// --------------------------------------------------
// 3. 選択されたタグを取得
// --------------------------------------------------

function getSelectedTags(name) {

  return Array.from(
    document.querySelectorAll(
      `input[name="${name}"]:checked`
    )
  ).map((input) => input.value);

}


// --------------------------------------------------
// 4. 好き・苦手の重複選択を防止
// --------------------------------------------------

function updateTagOptions() {

  const likedTags = getSelectedTags('liked');

  const dislikedTags = getSelectedTags('disliked');

  document.querySelectorAll(
    'input[name="liked"]'
  ).forEach((input) => {

    input.disabled =
      dislikedTags.includes(input.value);

  });

  document.querySelectorAll(
    'input[name="disliked"]'
  ).forEach((input) => {

    input.disabled =
      likedTags.includes(input.value);

  });

  // 好きな香りが1つ以上選択されたら検索可能
  $('search-button').disabled =
    allRums.length === 0 ||
    likedTags.length === 0;

}


// --------------------------------------------------
// 5. 銘柄の検索用タグを取得
// --------------------------------------------------

function getRumTags(rum) {

  if (!Array.isArray(rum.flavor_tags)) {
    return [];
  }

  return [
    ...new Set(
      rum.flavor_tags
        .filter((tag) => typeof tag === 'string')
        .map((tag) => tag.trim())
        .filter(Boolean)
    )
  ];

}


// --------------------------------------------------
// 6. 推薦スコアを計算
// --------------------------------------------------

function calculateScore(
  rum,
  likedTags,
  dislikedTags
) {

  const rumTags = getRumTags(rum);

  // 好きな香りとの一致
  const matchedLikes = likedTags.filter(
    (tag) => rumTags.includes(tag)
  );

  // 苦手な香りとの一致
  const matchedDislikes = dislikedTags.filter(
    (tag) => rumTags.includes(tag)
  );

  // 好きな香りの一致率
  const matchRate = likedTags.length > 0
    ? matchedLikes.length / likedTags.length
    : 0;

  // 基本スコア
  const baseScore = matchRate * 100;

  // 苦手な香りによる減点
  const penalty =
    matchedDislikes.length * DISLIKE_PENALTY;

  // 最終スコア：0〜100点
  const score = Math.max(
    0,
    Math.min(100, baseScore - penalty)
  );

  return {
    rum,
    score,
    matchRate,
    matchedLikes,
    matchedDislikes
  };

}


// --------------------------------------------------
// 7. おすすめ銘柄を選択
// --------------------------------------------------

function recommendRums(
  likedTags,
  dislikedTags,
  count
) {

  return allRums

    // 全銘柄のスコアを計算
    .map((rum) => calculateScore(
      rum,
      likedTags,
      dislikedTags
    ))

    // 好きな香りが1つ以上一致し、
    // スコアが0より大きい銘柄のみ
    .filter((result) =>
      result.matchedLikes.length > 0 &&
      result.score > 0
    )

    // スコアが高い順に並べる
    .sort((a, b) => {

      // ① 推薦スコア
      if (b.score !== a.score) {
        return b.score - a.score;
      }

      // ② 苦手な香りが少ない銘柄を優先
      if (
        a.matchedDislikes.length !==
        b.matchedDislikes.length
      ) {
        return (
          a.matchedDislikes.length -
          b.matchedDislikes.length
        );
      }

      // ③ 好きな香りの一致数
      if (
        b.matchedLikes.length !==
        a.matchedLikes.length
      ) {
        return (
          b.matchedLikes.length -
          a.matchedLikes.length
        );
      }

      // ④ 同点の場合は銘柄ID順
      return String(a.rum.id).localeCompare(
        String(b.rum.id)
      );

    })

    // 指定された本数まで取得
    .slice(0, count);

}


// --------------------------------------------------
// 8. 表示用の共通関数
// --------------------------------------------------

function detailLine(label, value) {

  const paragraph = el('p');

  paragraph.append(
    el('strong', '', label + '：'),
    document.createTextNode(value || '—')
  );

  return paragraph;

}


// --------------------------------------------------
// 9. 推薦結果のカードを作成
// --------------------------------------------------

function createResultCard(result, rank) {

  const rum = result.rum;

  const card = el('article', 'card recommend-card');

  // 推薦順位
  card.append(
    el(
      'p',
      'recommend-rank',
      'おすすめ ' + rank
    )
  );

  // ボトル画像
  card.append(
    picture(rum)
  );

  // 銘柄名
  const heading = el('h3');

  const link = el('a', '', rum.name);

  link.href =
    'rum.html?id=' + encodeURIComponent(rum.id);

  heading.append(link);

  card.append(heading);

  // 生産国
  card.append(
    detailLine('生産国', rum.country)
  );

  // アルコール度数
  card.append(
    detailLine(
      '度数',
      rum.abv == null
        ? '未設定'
        : rum.abv + '%'
    )
  );

  // 推薦スコア
  card.append(
    detailLine(
      'おすすめスコア',
      result.score.toFixed(1) + ' / 100'
    )
  );

  // 好きな香りの一致率
  card.append(
    detailLine(
      '香りの一致率',
      (result.matchRate * 100).toFixed(1) + '%'
    )
  );

  // 一致した好きな香り
  card.append(
    detailLine(
      '好みに合う香り',
      result.matchedLikes.join('、')
    )
  );

  // 苦手な香り
  if (result.matchedDislikes.length > 0) {

    card.append(
      detailLine(
        '苦手な香りも含まれます',
        result.matchedDislikes.join('、')
      )
    );

  }

  // 銘柄の特徴
  card.append(
    detailLine('特徴', rum.description)
  );

  // 香りの原文
  card.append(
    detailLine('香り', rum.aroma)
  );

  // 詳細ページへのリンク
  const detailLink = el(
    'a',
    'recommend-detail-link',
    '銘柄の詳細を見る →'
  );

  detailLink.href =
    'rum.html?id=' + encodeURIComponent(rum.id);

  card.append(detailLink);

  return card;

}


// --------------------------------------------------
// 10. 推薦結果を表示
// --------------------------------------------------

function displayResults(results, requestedCount) {

  const container = $('recommend-results');

  const status = $('result-status');

  container.replaceChildren();

  if (results.length === 0) {

    status.textContent =
      '条件に合う銘柄が見つかりませんでした。' +
      '香りの選択条件を変更してください。';

    return;

  }

  if (results.length < requestedCount) {

    status.textContent =
      `条件に合う${results.length}銘柄を表示しています。` +
      '指定本数に満たないため、該当する銘柄のみ表示します。';

  } else {

    status.textContent =
      `好みに近い${results.length}銘柄を表示しています。`;

  }

  results.forEach((result, index) => {

    container.append(
      createResultCard(result, index + 1)
    );

  });

}


// --------------------------------------------------
// 11. 検索ボタンの処理
// --------------------------------------------------

$('recommend-form').addEventListener(
  'submit',
  (event) => {

    event.preventDefault();

    const likedTags =
      getSelectedTags('liked');

    const dislikedTags =
      getSelectedTags('disliked');

    const selectedCount = document.querySelector(
      'input[name="count"]:checked'
    );

    const count = Number(
      selectedCount?.value || 3
    );

    if (likedTags.length === 0) {

      $('result-status').textContent =
        '好きな香りを1つ以上選択してください。';

      return;

    }

    const results = recommendRums(
      likedTags,
      dislikedTags,
      count
    );

    displayResults(results, count);

    // 検索結果までスクロール
    $('result-status').scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    });

  }
);


// --------------------------------------------------
// 12. リセットボタンの処理
// --------------------------------------------------

$('recommend-form').addEventListener(
  'reset',
  () => {

    // フォームのリセット完了後に処理
    setTimeout(() => {

      updateTagOptions();

      $('recommend-results').replaceChildren();

      $('result-status').textContent =
        '好みの香りを選択して検索してください。';

    }, 0);

  }
);


// --------------------------------------------------
// 13. 初期読み込み
// --------------------------------------------------

async function initialize() {

  try {

    // 香りの選択肢を作成
    createTagOptions(
      'liked-tags',
      'liked'
    );

    createTagOptions(
      'disliked-tags',
      'disliked'
    );

    // Supabaseから公開済み銘柄を取得
    const rums = await getRums();

    // 検索用タグが登録されている銘柄
    allRums = rums.filter(
      (rum) => getRumTags(rum).length > 0
    );

    $('status').textContent =
      `${allRums.length}銘柄からおすすめを探せます。`;

    updateTagOptions();

  } catch (error) {

    $('status').textContent =
      '銘柄データを読み込めませんでした：' +
      error.message;

    $('search-button').disabled = true;

  }

}


// ページ読み込み時に実行
initialize();
