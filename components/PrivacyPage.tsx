/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';

const PrivacyPage: React.FC = () => {
  return (
    <div className="prose dark:prose-invert prose-lg max-w-none">
      <h2 className="text-3xl font-bold mb-6 text-center">Política de Privacidade</h2>

      <p><em>Última atualização: 24 de maio de 2024</em></p>

      <p>
        A sua privacidade é importante para nós. Esta Política de Privacidade explica como a Wikipreta.org coleta, usa e protege suas informações.
      </p>

      <h3 className="text-2xl font-bold mt-8 mb-4">Coleta de Dados</h3>
      <p>
        Nós não coletamos informações de identificação pessoal dos nossos usuários, como nome, endereço ou e-mail. A plataforma pode coletar dados anônimos de uso para entender como nosso serviço está sendo utilizado e como podemos melhorá-lo.
      </p>

      <h3 className="text-2xl font-bold mt-8 mb-4">Cookies</h3>
      <p>
        A Wikipreta.org pode usar cookies para melhorar a experiência do usuário. Cookies são pequenos arquivos de dados armazenados no seu dispositivo. Nossos parceiros de publicidade (Google AdSense) podem usar cookies para exibir anúncios relevantes. Você pode desativar os cookies nas configurações do seu navegador a qualquer momento.
      </p>

      <h3 className="text-2xl font-bold mt-8 mb-4">Serviços de Terceiros</h3>
      <ul>
        <li>
          <strong>Google Gemini API:</strong> As suas pesquisas e interações são enviadas para a API do Google Gemini para gerar o conteúdo enciclopédico. O uso desses dados pelo Google é regido pela Política de Privacidade do Google.
        </li>
        <li>
          <strong>Google AdSense:</strong> Utilizamos o Google AdSense para exibir anúncios. O Google pode usar cookies para personalizar os anúncios com base nas suas visitas a este e outros sites. Você pode optar por não receber publicidade personalizada visitando as <a href="https://www.google.com/settings/ads" target="_blank" rel="noopener noreferrer">Configurações de Anúncios</a> do Google.
        </li>
      </ul>

      <h3 className="text-2xl font-bold mt-8 mb-4">Seus Direitos</h3>
      <p>
        Como não coletamos dados pessoais, não há dados para acessar, corrigir ou excluir. Para questões relacionadas a dados coletados por serviços de terceiros, por favor, consulte as políticas de privacidade deles.
      </p>
      
      <h3 className="text-2xl font-bold mt-8 mb-4">Alterações nesta Política</h3>
      <p>
        Podemos atualizar nossa Política de Privacidade de tempos em tempos. Notificaremos sobre quaisquer alterações publicando a nova Política de Privacidade nesta página.
      </p>

    </div>
  );
};

export default PrivacyPage;
