/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';

const AboutPage: React.FC = () => {
  return (
    <div className="prose dark:prose-invert prose-lg max-w-none">
      <h2 className="text-3xl font-bold mb-6 text-center">Sobre a Wikipreta.org</h2>
      <p>
        A Wikipreta.org é uma plataforma digital colaborativa, em formato de enciclopédia, que registra biografias, acontecimentos, movimentos sociais, culturais e políticos ligados à população negra.
      </p>
      <p>
        Tem como objetivo valorizar e difundir a história preta do Brasil, da África e da diáspora, combater o apagamento histórico e ampliar as referências para futuras gerações.
      </p>
      <p>
        Utilizando a tecnologia de inteligência artificial do Google Gemini, cada verbete é gerado dinamicamente, criando uma rede de conhecimento interconectada. Ao clicar em uma palavra destacada, você navega para um novo verbete, explorando a riqueza e a profundidade da história e cultura negra de uma forma fluida e contínua.
      </p>
      <p>
        Este projeto é um esforço para garantir que as narrativas, as lutas e as conquistas da população negra sejam preservadas, celebradas e facilmente acessíveis a todos.
      </p>
    </div>
  );
};

export default AboutPage;
