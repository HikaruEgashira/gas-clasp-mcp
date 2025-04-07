import React from 'react';
import type { ReactNode } from 'react';
import clsx from 'clsx';
import Heading from '@theme/Heading';
import styles from './styles.module.css';

type FeatureItem = {
  title: string;
  imgSrc: string;
  imgAlt: string;
  description: ReactNode;
}

const FeatureList: FeatureItem[] = [
  {
    title: '自然な日本語で操作',
    imgSrc: 'img/1.png',
    imgAlt: '自然な日本語で会話する女性のイラスト',
    description: (
      <>
        コマンドやプログラミング不要。やりたいことを日本語で伝えるだけで自動で処理。
      </>
    ),
  },
  {
    title: 'Google Apps Scriptを簡単管理',
    imgSrc: 'img/2.png',
    imgAlt: 'Google Apps Scriptのアイコン風イラスト',
    description: (
      <>
        新規作成・複製・更新・公開もすべて会話で完結。Googleアカウント認証も自動。
      </>
    ),
  },
  {
    title: '自動化・効率化',
    imgSrc: 'img/3.png',
    imgAlt: '自動化・効率化を象徴する歯車のイラスト',
    description: (
      <>
        面倒な手作業を減らし、作業効率アップ。繰り返し作業も自然言語で自動化。
      </>
    ),
  },
];

function Feature({ title, imgSrc, imgAlt, description }: FeatureItem) {
  return (
    <div className={clsx('col col--4')}>
      <div className="text--center">
        <img src={imgSrc} alt={imgAlt} className={styles.featureSvg} />
      </div>
      <div className="text--center padding-horiz--md">
        <Heading as="h3">{title}</Heading>
        <p>{description}</p>
      </div>
    </div>
  );
}

export default function HomepageFeatures(): ReactNode {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}
