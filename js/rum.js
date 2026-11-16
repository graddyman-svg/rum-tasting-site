
const $ = (id) => document.getElementById(id);

const id = new URLSearchParams(location.search).get('id');

const PROFILE_KEY = 'rum-tasting-profile-v1';
const profileKeys = ['nickname', 'gender', 'age_group'];

// --------------------------------------------------
// 投稿者情報の保存
// --------------------------------------------------

function saveProfile() {
  const profile = {};

  for (const key of profileKeys) {
    profile[key] = $(key).value;
  }

  profile.favorite_drinks = Array.from(
    document.querySelectorAll(
      'input[name="favorite_drinks"]:checked'
    )
  ).map((input) => input.value);

  localStorage.setItem(
    PROFILE_KEY,
    JSON.stringify(profile)
  );
}

// --------------------------------------------------
// 投稿者情報の復元
// --------------------------------------------------

function restoreProfile() {
  try {
    const profile = JSON.parse(
      localStorage.getItem(PROFILE_KEY) || 'null'
    );

    if (!profile) return;

    for (const key of profileKeys) {
      if (profile[key] !== undefined) {
        $(key).value = profile[key];
      }
    }

    for (const input of document.querySelectorAll(
      'input[name="favorite_drinks"]'
    )) {
      input.checked = (
        profile.favorite_drinks || []
      ).includes(input.value);
    }
  } catch (error) {
    // 保存情報が読み取れない場合は無視
  }
}

// --------------------------------------------------
// 保存済み投稿者情報の削除
// --------------------------------------------------

$('forget-profile').addEventListener('click', () => {
  localStorage.removeItem(PROFILE_KEY);

  for (const key of profileKeys) {
    $(key).value = '';
  }

  document.querySelectorAll(
    'input[name="favorite_drinks"]'
  ).forEach((input) => {
    input.checked = false;
  });

  $('remember').checked = false;

  $('form-status').textContent =
    '端末の保存情報を削除しました。';
});

// --------------------------------------------------
// 表示用の共通関数
// --------------------------------------------------

function line(label, value) {
  const paragraph = el('p');

  paragraph.append(
    el('strong', '', label + '：'),
    document.createTextNode(value || '—')
  );

  return paragraph;
}

function avg(reviews, key) {
  if (!reviews.length) {
    return '—';
  }

  const total = reviews.reduce(
    (sum, review) => sum + Number(review[key]),
    0
  );

  return (total / reviews.length).toFixed(2);
}

// --------------------------------------------------
// 公開済み口コミの読み込み
// --------------------------------------------------

async function loadReviews() {
  const list = $('reviews');
  const stats = $('stats');

  list.replaceChildren();

  const reviews = await getReviews(id);

  const averageDryness = avg(reviews, 'dryness');
  const averageBody = avg(reviews, 'body');

  stats.textContent =
    `公開済み ${reviews.length}件 ／ ` +
    `甘口(1)〜辛口(5) 平均 ${averageDryness} ／ ` +
    `軽い(1)〜重い(5) 平均 ${averageBody}`;

  if (!reviews.length) {
    list.append(
      el('p', 'muted', 'まだ公開された投稿はありません。')
    );
    return;
  }

  for (const review of reviews) {
    const article = el('article', 'review');

    const date = new Date(
      review.created_at
    ).toLocaleDateString('ja-JP');

    const scoreText =
      `甘口(1)〜辛口(5)：${review.dryness}/5 · ` +
      `軽い(1)〜重い(5)：${review.body}/5 · ` +
      date;

    article.append(
      el('h3', '', review.nickname),
      el('p', 'muted', scoreText),
      line('樽香', review.oak_note),
      line('果実感', review.fruit_note),
      line('スパイス感', review.spice_note),
      line('好み・感想', review.preference_note)
    );

    list.append(article);
  }
}

// --------------------------------------------------
// 銘柄詳細の読み込み
// --------------------------------------------------

async function loadRum() {
  // 銘柄IDの形式を確認
  if (!/^RD\d{3}$/.test(id || '')) {
    $('status').textContent =
      '銘柄IDが正しくありません。';
    return;
  }

  // 保存済みの投稿者情報を復元
  restoreProfile();

  try {
    const rum = await getRum(id);

    if (!rum) {
      $('status').textContent =
        '銘柄が見つかりません。';
      return;
    }

    // ページタイトル
    document.title =
      rum.name + ' | ラム酒テイスティング';

    // 銘柄の基本情報
    $('status').textContent =
      rum.id + ' · ' + rum.country;

    $('rum-name').textContent = rum.name;

    // ボトル画像
    $('rum-image').append(
      picture(rum)
    );

    // 詳細情報
    const detail = $('rum-detail');

    const detailItems = [
      ['メーカー', rum.maker],

      [
        '度数',
        rum.abv == null ? '' : rum.abv + '%'
      ],

      [
        '参考価格帯',
        rum.price_level
          ? '★'.repeat(rum.price_level) +
            '☆'.repeat(5 - rum.price_level)
          : ''
      ],

      ['原料・製法', rum.production],

      ['熟成・風味付け', rum.aging_flavor],

      ['特徴', rum.description],

      // 管理者基準という表記を削除
      [
        '甘口(1)〜辛口(5)',
        rum.base_dryness == null
          ? '未設定'
          : rum.base_dryness + '/5'
      ],

      [
        '軽い(1)〜重い(5)',
        rum.base_body == null
          ? '未設定'
          : rum.base_body + '/5'
      ]
    ];

    for (const [label, value] of detailItems) {
      detail.append(
        line(label, String(value || ''))
      );
    }

    // 参考商品ページ
    if (rum.reference_url) {
      const link = el(
        'a',
        '',
        '参考商品ページ'
      );

      link.href = rum.reference_url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';

      detail.append(link);
    }

    // 公開済み口コミを表示
    await loadReviews();

  } catch (error) {
    $('status').textContent = error.message;
  }
}

// ページ表示時に銘柄情報を読み込む
loadRum();

// --------------------------------------------------
// 口コミ投稿処理
// ※ 現在はHTMLでフォームを非表示にし、
//   Edge Function側でも投稿を停止しています。
// --------------------------------------------------

$('review-form').addEventListener(
  'submit',
  async (event) => {
    event.preventDefault();

    const button = $('send');
    const status = $('form-status');

    button.disabled = true;
    status.textContent = '送信中…';

    try {
      const nickname = $('nickname').value.trim();

      if (!nickname) {
        throw new Error(
          'ニックネームを入力してください。'
        );
      }

      const payload = {
        rum_id: id,
        nickname: nickname,

        dryness: Number(
          $('dryness').value
        ),

        body: Number(
          $('body').value
        ),

        oak_note: $('oak_note').value.trim(),

        fruit_note: $('fruit_note').value.trim(),

        spice_note: $('spice_note').value.trim(),

        preference_note:
          $('preference_note').value.trim(),

        gender: $('gender').value || null,

        age_group:
          $('age_group').value || null,

        favorite_drinks: Array.from(
          document.querySelectorAll(
            'input[name="favorite_drinks"]:checked'
          )
        ).map((input) => input.value)
      };

      // Supabase Edge Functionへ送信
      await submitReview(payload);

      // 投稿者情報の保存
      if ($('remember').checked) {
        saveProfile();
      } else {
        localStorage.removeItem(PROFILE_KEY);
      }

      status.textContent =
        '投稿を受け付けました。' +
        '管理者の承認後に公開されます。';

      // 入力した感想をクリア
      [
        'oak_note',
        'fruit_note',
        'spice_note',
        'preference_note'
      ].forEach((key) => {
        $(key).value = '';
      });

    } catch (error) {
      status.textContent =
        '送信できませんでした：' +
        error.message;

    } finally {
      button.disabled = false;
    }
  }
);
