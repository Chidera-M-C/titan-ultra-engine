import React, { useState } from 'react';
import './StyleView.css';

const MOODS = [
  {
    id: 'female_nude_portrait',
    image: '/styles/female_nude_portrait.jpg',
    title: 'Female Nude Portrait',
    description: 'Elegant, artistic, fully exposed',
    prompt: 'masterpiece, best quality, ultra detailed 8k, photorealistic, beautiful nude woman, solo female, elegant artistic pose, completely naked, bare skin, detailed anatomy, perky breasts, erect nipples, soft natural lighting, studio portrait, shallow depth of field, cinematic composition, flawless skin texture, sensual expression, high fashion editorial, intimate atmosphere',
    gradient: 'linear-gradient(160deg, #1a0a1a, #3d1a2e, #7b2d52)',
  },
  {
    id: 'missionary_style',
    image: '/styles/missionary_style.jpg',
    title: 'Missionary Style',
    description: 'Intimate, deep, eye contact',
    prompt: 'masterpiece, ultra detailed 8k, photorealistic, passionate missionary sex, 1girl 1boy, legs spread wide, deep penetration, mating press, eye contact, intense expression, completely naked, detailed pussy penetration, erect cock inside vagina, sweaty bodies, skin contact, soft bedroom lighting, cinematic close-up, intimate atmosphere, breeding position, high detail anatomy',
    gradient: 'linear-gradient(160deg, #1a0a0a, #3d1010, #7b2020)',
  },
  {
    id: 'doggy_style',
    image: '/styles/doggy_style.jpg',
    title: 'Doggy Style',
    description: 'From behind, arched, intense',
    prompt: 'masterpiece, best quality, ultra detailed 8k, photorealistic, passionate doggy style sex, 1girl 1boy, on all fours, ass up face down, deep penetration from behind, arched back, detailed pussy penetration, thick cock in vagina, ass spread, sweaty skin, intense expression, bedroom setting, low angle shot, cinematic lighting, high detail anatomy, raw passion',
    gradient: 'linear-gradient(160deg, #0a1a0a, #1a3d1a, #2d6e2d)',
  },
  {
    id: 'dressed_vs_naked',
    image: '/styles/dressed_vs_naked.jpg',
    title: 'Dressed vs Naked',
    description: 'Contrast, tease, reveal',
    prompt: 'masterpiece, ultra detailed 8k, photorealistic, dressed vs naked contrast, beautiful woman partially clothed, tight dress lifted, exposed breasts and pussy, detailed skin texture, seductive pose, soft bedroom lighting, cinematic composition, teasing expression, high fashion tease, intimate atmosphere, detailed fabric texture vs bare skin',
    gradient: 'linear-gradient(160deg, #1a1400, #3d3000, #8a6d00)',
  },
  {
    id: 'cowgirl_style',
    image: '/styles/cowgirl_style.jpg',
    title: 'Cowgirl Style',
    description: 'Dominant female, riding, control',
    prompt: 'masterpiece, best quality, ultra detailed 8k, photorealistic, passionate cowgirl sex, 1girl 1boy, woman on top riding cock, straddling position, breasts bouncing, hands on chest, detailed penetration, wet pussy on erect cock, dominant expression, bedroom setting, low angle shot, cinematic lighting, high detail anatomy, intense riding',
    gradient: 'linear-gradient(160deg, #1a0a2a, #3d1a4a, #7b2d7b)',
  },
  {
    id: 'anal_sex',
    image: '/styles/anal_sex.jpg',
    title: 'Anal Sex',
    description: 'Intense, deep anal penetration',
    prompt: 'masterpiece, ultra detailed 8k, photorealistic, intense anal sex, 1girl 1boy, anal penetration, thick cock deep in ass, gaping anus, ass spread wide, detailed anal anatomy, sweaty bodies, pained/pleasure expression, doggy or missionary anal pose, low angle shot, cinematic lighting, high detail skin texture, raw hardcore',
    gradient: 'linear-gradient(160deg, #0a0a1a, #1a1a3d, #2d1b5e)',
  },
  {
    id: 'oral_sex',
    image: '/styles/oral_sex.jpg',
    title: 'Oral Sex',
    description: 'Oral pleasure, deepthroat, licking',
    prompt: 'masterpiece, best quality, ultra detailed 8k, photorealistic, passionate oral sex, 1girl 1boy, deepthroat blowjob, cock in mouth, throat bulge, sloppy saliva, tongue on shaft, detailed oral anatomy, kneeling pose, intense eye contact, bedroom setting, close-up shot, cinematic lighting, high detail',
    gradient: 'linear-gradient(160deg, #1a0a0a, #3d1010, #7b2020)',
  },
  {
    id: 'threesome_sex',
    image: '/styles/threesome_sex.jpg',
    title: 'Threesome',
    description: 'Multiple partners, intense group',
    prompt: 'masterpiece, ultra detailed 8k, photorealistic, passionate threesome sex, 1girl 2boys, double penetration, spitroast position, one cock in pussy one in mouth, detailed anatomy, sweaty bodies, intense expressions, bedroom setting, low angle shot, cinematic lighting, high detail group sex',
    gradient: 'linear-gradient(160deg, #1a0a1a, #3d1a3d, #7b2d7b)',
  },
  {
    id: 'lesbian_sex',
    image: '/styles/lesbian_sex.jpg',
    title: 'Lesbian Sex',
    description: 'Passionate, intimate female-on-female',
    prompt: 'masterpiece, best quality, ultra detailed 8k, photorealistic, passionate lesbian sex, 2girls, intimate female-on-female, scissoring, tribbing, 69 position, strap-on penetration, detailed pussy-on-pussy contact, wet clits rubbing, aroused expressions, heavy breathing, kissing, nipple sucking, sweaty bodies, soft bedroom lighting, close-up intimate shot, sensual atmosphere, high detail anatomy, erotic lesbian passion',
    gradient: 'linear-gradient(160deg, #1a0a2a, #3d1a4a, #7b2d7b)',
  },
  {
    id: 'cum_on_face',
    image: '/styles/cum_on_face.jpg',
    title: 'Cum on Face',
    description: 'Facial, messy finish',
    prompt: 'masterpiece, ultra detailed 8k, photorealistic, intense cum on face, beautiful woman, thick cum on cheeks and lips, dripping semen, post-orgasm expression, detailed facial anatomy, close-up shot, soft lighting, high detail cum texture, erotic finish',
    gradient: 'linear-gradient(160deg, #1a0a0a, #3d1010, #7b2020)',
  },
];

export default function StyleView({ onSelectStyle }) {
  const [selected, setSelected] = useState(null);

  const handleSelect = (mood) => {
    setSelected(mood.id);
    onSelectStyle(mood);
  };

  return (
    <div className="style-view">
      <div className="style-header">
        <h2 className="style-title">Choose a Mood</h2>
        <p className="style-subtitle">Select a mood to set the tone of your generation</p>
      </div>

      <div className="style-grid">
        {MOODS.map((mood) => (
          <div
            key={mood.id}
            className={`style-card ${selected === mood.id ? 'selected' : ''}`}
            onClick={() => handleSelect(mood)}
            style={{
              backgroundImage: mood.image ? `url(${mood.image})` : mood.gradient,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          >
            <div className="style-card-content">
              <span className="style-card-title">{mood.title}</span>
              <span className="style-card-desc">{mood.description}</span>
            </div>
            {selected === mood.id && (
              <div className="style-card-check">✓</div>
            )}
          </div>
        ))}
      </div>

      {selected && (
        <p className="style-applied">
          Mood applied — head to the prompt box and hit generate
        </p>
      )}
    </div>
  );
}
