let jogadorAtual = 'X';
        let tabuleiroJogo = ['', '', '', '', '', '', '', '', ''];
        let jogoAtivo = true;
        let jogadorEhX = true;
        let placares = { ia: 0, jogador: 0 };
        let profundidadeMaxima = 2;
        let historicoJogadas = [];
        let nosAnalisados = 0;
        let dificuldade = 'impossivel';
        let dadosArvore = null;
        let caminhoSelecionado = [];
        let caminhoAnalisando = [];
        let estaMostrandoCaminho = false;
        let passoAnimacaoCaminho = 0;
        let todosCaminhos = []; 
        let nosFaltantes = []; 
        
        
        let larguraArvore = 0;
        let alturaArvore = 0;
        let larguraCanvasBase = 1600; 
        let alturaCanvasBase = 600; 
        let deslocamentoX = 0;
        let deslocamentoY = 0;
        
        let nivelZoom = 1.0;
        const ZOOM_MINIMO = 0.5;
        const ZOOM_MAXIMO = 3.0;
        const PASSO_ZOOM = 0.1;
        
        const elementoTabuleiroJogo = document.getElementById('tabuleiroJogo');
        const elementoStatusJogo = document.getElementById('statusJogo');
        const canvasArvore = document.getElementById('canvasArvore');
        const contexto = canvasArvore.getContext('2d');
        const controleProfundidade = document.getElementById('controleProfundidade');
        const valorProfundidade = document.getElementById('valorProfundidade');
        const elementoContadorNos = document.getElementById('contadorNos');
        const elementoPlacarIA = document.getElementById('placarIA');
        const elementoPlacarJogador = document.getElementById('placarJogador');
        const iaPensando = document.getElementById('iaPensando');
        const elementoTotalNos = document.getElementById('totalNos');
        const elementoProfundidadeArvore = document.getElementById('profundidadeArvore');
        const elementoFatorRamificacao = document.getElementById('fatorRamificacao');
        const elementoTempoAvaliacao = document.getElementById('tempoAvaliacao');
        const elementoCaminhoSelecionado = document.getElementById('caminhoSelecionado');
        const elementoPassosCaminho = document.getElementById('passosCaminho');
        const elementoExplicacaoCaminho = document.getElementById('explicacaoCaminho');
        const elementoNivelZoom = document.getElementById('nivelZoom');

        
        function inicializarTabuleiro() {
            elementoTabuleiroJogo.innerHTML = '';
            for (let i = 0; i < 9; i++) {
                const celula = document.createElement('div');
                celula.className = 'celula';
                celula.dataset.indice = i;
                celula.addEventListener('click', () => clicarCelula(i));
                elementoTabuleiroJogo.appendChild(celula);
            }
            atualizarStatusJogo();
            
            setTimeout(() => {
                atualizarExibicaoArvore();
                const containerArvore = document.querySelector('.container-arvore');
                containerArvore.scrollTop = 0;
                containerArvore.scrollLeft = 0;
            }, 100);
        }

        
        function atualizarStatusJogo() {
            if (!jogoAtivo) {
                const vencedor = verificarVencedor();
                if (vencedor === 'O') {
                    elementoStatusJogo.textContent = 'IA Venceu!';
                    elementoStatusJogo.style.color = '#2575fc';
                } else if (vencedor === 'X') {
                    elementoStatusJogo.textContent = 'Jogador Venceu!';
                    elementoStatusJogo.style.color = '#28a745';
                } else {
                    elementoStatusJogo.textContent = 'Empate!';
                    elementoStatusJogo.style.color = '#6c757d';
                }
            } else {
                const textoJogador = jogadorAtual === 'X' ? 
                    (jogadorEhX ? 'Sua vez (X)' : 'IA (X) pensando...') : 
                    'IA (O) pensando...';
                elementoStatusJogo.textContent = textoJogador;
                elementoStatusJogo.style.color = jogadorAtual === 'X' ? '#dc3545' : '#2575fc';
            }
        }

        
        function clicarCelula(indice) {
            if (!jogoAtivo || tabuleiroJogo[indice] !== '' || jogadorAtual === 'O') {
                return;
            }

            fazerJogada(indice, jogadorAtual);
        }

        
        function fazerJogada(indice, jogador) {
            historicoJogadas.push({
                tabuleiro: [...tabuleiroJogo],
                jogador: jogadorAtual,
                placarIA: placares.ia,
                placarJogador: placares.jogador,
                caminho: [...caminhoSelecionado]
            });

            tabuleiroJogo[indice] = jogador;
            const celula = elementoTabuleiroJogo.children[indice];
            celula.textContent = jogador;
            celula.classList.add(jogador.toLowerCase());
            
            const vencedor = verificarVencedor();
            if (vencedor) {
                finalizarJogo(vencedor);
            } else if (tabuleiroCheio()) {
                finalizarJogo('empate');
            } else {
                jogadorAtual = jogadorAtual === 'X' ? 'O' : 'X';
                atualizarStatusJogo();
                
                if (jogoAtivo && jogadorAtual === 'O') {
                    mostrarAtrasoIA();
                    setTimeout(() => {
                        analisarEMostrarCaminho().then(() => {
                            setTimeout(fazerJogadaIA, 1000);
                        });
                    }, 500);
                } else {
                    atualizarExibicaoArvore();
                }
            }
        }

        
        async function analisarEMostrarCaminho() {
            estaMostrandoCaminho = true;
            passoAnimacaoCaminho = 0;
            caminhoAnalisando = [];
            
            const tempoInicio = performance.now();
            const resultado = calcularJogadaIA();
            const tempoFim = performance.now();
            
            caminhoAnalisando = resultado.caminho || [];
            todosCaminhos = resultado.todosCaminhos || [];
            elementoTempoAvaliacao.textContent = Math.round(tempoFim - tempoInicio) + 'ms';
            
            atualizarExibicaoCaminho(caminhoAnalisando);
            
            await animarCaminho(caminhoAnalisando);
            
            estaMostrandoCaminho = false;
        }

        
        async function animarCaminho(caminho) {
            for (let i = 0; i <= caminho.length; i++) {
                passoAnimacaoCaminho = i;
                atualizarExibicaoArvore();
                
                if (i === 0) {
                    elementoExplicacaoCaminho.textContent = 'IA iniciando análise do tabuleiro atual...';
                } else {
                    const jogada = caminho[i-1];
                    const linha = Math.floor(jogada / 3) + 1;
                    const coluna = (jogada % 3) + 1;
                    const explicacao = i === 1 ? 
                        `IA analisa jogar em (${linha},${coluna})` :
                        `Considerando jogada do oponente em (${linha},${coluna})`;
                    
                    elementoExplicacaoCaminho.textContent = explicacao;
                }
                
                await new Promise(resolver => setTimeout(resolver, 800));
            }
        }

        
        function atualizarExibicaoCaminho(caminho) {
            elementoPassosCaminho.innerHTML = '';
            
            if (caminho.length === 0) {
                elementoPassosCaminho.innerHTML = '<span class="passo-caminho">Jogada direta</span>';
                elementoCaminhoSelecionado.textContent = 'Jogada direta';
                return;
            }
            
            let htmlCaminho = '';
            for (let i = 0; i < caminho.length; i++) {
                const jogada = caminho[i];
                const linha = Math.floor(jogada / 3) + 1;
                const coluna = (jogada % 3) + 1;
                const classePasso = i === 0 ? 'passo-caminho atual' : 'passo-caminho futuro';
                htmlCaminho += `<span class="${classePasso}">(${linha},${coluna})</span>`;
                if (i < caminho.length - 1) {
                    htmlCaminho += ' → ';
                }
            }
            
            elementoPassosCaminho.innerHTML = htmlCaminho;
            
            const descricaoCaminho = caminho.map(jogada => {
                const linha = Math.floor(jogada / 3) + 1;
                const coluna = (jogada % 3) + 1;
                return `(${linha},${coluna})`;
            }).join(' → ');
            
            elementoCaminhoSelecionado.textContent = descricaoCaminho;
        }

        
        function mostrarAtrasoIA() {
            iaPensando.style.display = 'block';
        }

        
        function esconderAtrasoIA() {
            iaPensando.style.display = 'none';
        }

        
        function verificarVencedor() {
            const padroesVitoria = [
                [0, 1, 2], [3, 4, 5], [6, 7, 8],
                [0, 3, 6], [1, 4, 7], [2, 5, 8],
                [0, 4, 8], [2, 4, 6]
            ];

            for (const padrao of padroesVitoria) {
                const [a, b, c] = padrao;
                if (tabuleiroJogo[a] && tabuleiroJogo[a] === tabuleiroJogo[b] && tabuleiroJogo[a] === tabuleiroJogo[c]) {
                    [a, b, c].forEach(indice => {
                        elementoTabuleiroJogo.children[indice].classList.add('vencedora');
                    });
                    return tabuleiroJogo[a];
                }
            }
            return null;
        }

        
        function tabuleiroCheio() {
            return tabuleiroJogo.every(celula => celula !== '');
        }

        
        function finalizarJogo(resultado) {
            jogoAtivo = false;
            
            if (resultado === 'O') {
                placares.ia++;
                elementoStatusJogo.textContent = 'IA Venceu!';
            } else if (resultado === 'X') {
                placares.jogador++;
                elementoStatusJogo.textContent = 'Jogador Venceu!';
            } else {
                elementoStatusJogo.textContent = 'Empate!';
            }
            
            atualizarPlacares();
            atualizarExibicaoArvore();
            esconderAtrasoIA();
            elementoExplicacaoCaminho.textContent = 'Jogo finalizado';
        }

        
        function atualizarPlacares() {
            elementoPlacarIA.textContent = placares.ia;
            elementoPlacarJogador.textContent = placares.jogador;
        }

        
        function definirDificuldade(nivel) {
    console.log('Mudando dificuldade para:', nivel);
    
            
            document.getElementById('botaoFacil').className = 'botao-dificuldade';
            document.getElementById('botaoMedio').className = 'botao-dificuldade';
            document.getElementById('botaoImpossivel').className = 'botao-dificuldade';
            
            
            if (nivel === 'facil') {
                document.getElementById('botaoFacil').className = 'botao-dificuldade ativo';
            } else if (nivel === 'medio') {
                document.getElementById('botaoMedio').className = 'botao-dificuldade ativo';
            } else if (nivel === 'impossivel') {
                document.getElementById('botaoImpossivel').className = 'botao-dificuldade ativo';
            }
            
            
            dificuldade = nivel;
            
            console.log('Botão fácil classes:', document.getElementById('botaoFacil').className);
            console.log('Botão médio classes:', document.getElementById('botaoMedio').className);
            console.log('Botão impossível classes:', document.getElementById('botaoImpossivel').className);
            
            reiniciarJogo();
        }

        
        function calcularJogadaIA() {
            nosAnalisados = 0;
            caminhoSelecionado = [];
            todosCaminhos = [];
            
            switch(dificuldade) {
                case 'facil':
                    return { jogada: obterJogadaAleatoria(), caminho: [], todosCaminhos: [] };
                case 'medio':
                    return obterJogadaMedia();
                case 'impossivel':
                    return obterMelhorJogada();
            }
        }

        
        function fazerJogadaIA() {
    
    
    if (!jogoAtivo || !tabuleiroJogo.includes('') || jogadorAtual === 'X') {
        return;
    }
    
    const resultado = calcularJogadaIA();
    
    setTimeout(() => {
        if (resultado.jogada !== undefined) {
            
            if (jogadorAtual === 'O' && tabuleiroJogo[resultado.jogada] === '') {
                fazerJogada(resultado.jogada, jogadorAtual);
            }
        }
        esconderAtrasoIA();
        elementoContadorNos.textContent = nosAnalisados;
    }, 300);
}

        
        function obterJogadaAleatoria() {
            const jogadasDisponiveis = [];
            for (let i = 0; i < 9; i++) {
                if (tabuleiroJogo[i] === '') {
                    jogadasDisponiveis.push(i);
                }
            }
            nosAnalisados = jogadasDisponiveis.length;
            return jogadasDisponiveis[Math.floor(Math.random() * jogadasDisponiveis.length)];
        }

        
        function obterJogadaMedia() {
            if (Math.random() < 0.3) {
                return { jogada: obterJogadaAleatoria(), caminho: [], todosCaminhos: [] };
            }
            return obterMelhorJogadaComProfundidade(4);
        }

        
        function obterMelhorJogada() {
            return obterMelhorJogadaComProfundidade(9);
        }

        
        function obterMelhorJogadaComProfundidade(profundidadeBusca) {
            let melhorPontuacao = jogadorAtual === 'O' ? -Infinity : Infinity;
            let melhoresJogadas = [];
            let melhorCaminho = [];
            let todosCaminhosResultado = [];
            
            if (tabuleiroJogo.every(celula => celula === '') && jogadorAtual === 'O') {
                caminhoSelecionado = [4];
                return { jogada: 4, caminho: [4], todosCaminhos: [[4]] };
            }
            
            for (let i = 0; i < tabuleiroJogo.length; i++) {
                if (tabuleiroJogo[i] === '') {
                    tabuleiroJogo[i] = jogadorAtual;
                    const resultado = algoritmoMinimax(tabuleiroJogo, 0, jogadorAtual === 'O' ? false : true, profundidadeBusca, [i]);
                    tabuleiroJogo[i] = '';
                    nosAnalisados++;
                    
                    const pontuacao = resultado.pontuacao;
                    
                    todosCaminhosResultado.push({
                        jogada: i,
                        pontuacao: pontuacao,
                        caminho: resultado.caminho,
                        explorado: true
                    });
                    
                    if ((jogadorAtual === 'O' && pontuacao > melhorPontuacao) || 
                        (jogadorAtual === 'X' && pontuacao < melhorPontuacao)) {
                        melhorPontuacao = pontuacao;
                        melhoresJogadas = [i];
                        melhorCaminho = resultado.caminho;
                    } else if (pontuacao === melhorPontuacao) {
                        melhoresJogadas.push(i);
                        if (melhoresJogadas.length === 1) {
                            melhorCaminho = resultado.caminho;
                         }
                    }
                }
            }
            
            caminhoSelecionado = melhorCaminho;
            
            const todasJogadasPossiveis = [0, 1, 2, 3, 4, 5, 6, 7, 8].filter(i => tabuleiroJogo[i] === '');
            nosFaltantes = todasJogadasPossiveis.filter(jogada => 
                !todosCaminhosResultado.some(p => p.jogada === jogada)
            ).map(jogada => ({
                jogada: jogada,
                pontuacao: null,
                caminho: [jogada],
                explorado: false
            }));
            
            todosCaminhos = [...todosCaminhosResultado, ...nosFaltantes];
        
            return { jogada: melhoresJogadas[0], caminho: melhorCaminho, todosCaminhos: todosCaminhos };
        }

        
        function algoritmoMinimax(tabuleiro, profundidade, ehMaximizador, profundidadeMaxima, caminhoAtual) {
            const vencedor = verificarVencedorTabuleiro(tabuleiro);
            
            if (vencedor === 'O') return {pontuacao: 10 - profundidade, caminho: [...caminhoAtual]};
            if (vencedor === 'X') return {pontuacao: profundidade - 10, caminho: [...caminhoAtual]};
            if (tabuleiroCheioTabuleiro(tabuleiro)) return {pontuacao: 0, caminho: [...caminhoAtual]};
            if (profundidade >= profundidadeMaxima) return {pontuacao: avaliarTabuleiro(tabuleiro), caminho: [...caminhoAtual]};
            
            if (ehMaximizador) {
                let melhorPontuacao = -Infinity;
                let melhorCaminho = [];
                let todosCaminhosLocais = [];
                
                for (let i = 0; i < 9; i++) {
                    if (tabuleiro[i] === '') {
                        tabuleiro[i] = 'O';
                        const resultado = algoritmoMinimax(tabuleiro, profundidade + 1, false, profundidadeMaxima, [...caminhoAtual, i]);
                        tabuleiro[i] = '';
                        
                        todosCaminhosLocais.push({
                            jogada: i,
                            pontuacao: resultado.pontuacao,
                            caminho: resultado.caminho,
                            explorado: true
                        });
                        
                        if (resultado.pontuacao > melhorPontuacao) {
                            melhorPontuacao = resultado.pontuacao;
                            melhorCaminho = resultado.caminho;
                        }
                    }
                }
                return {pontuacao: melhorPontuacao, caminho: melhorCaminho, todosCaminhos: todosCaminhosLocais};
            } else {
                let melhorPontuacao = Infinity;
                let melhorCaminho = [];
                let todosCaminhosLocais = [];
                
                for (let i = 0; i < 9; i++) {
                    if (tabuleiro[i] === '') {
                        tabuleiro[i] = 'X';
                        const resultado = algoritmoMinimax(tabuleiro, profundidade + 1, true, profundidadeMaxima, [...caminhoAtual, i]);
                        tabuleiro[i] = '';
                        
                        todosCaminhosLocais.push({
                            jogada: i,
                            pontuacao: resultado.pontuacao,
                            caminho: resultado.caminho,
                            explorado: true
                        });
                        
                        if (resultado.pontuacao < melhorPontuacao) {
                            melhorPontuacao = resultado.pontuacao;
                            melhorCaminho = resultado.caminho;
                        }
                    }
                }
                return {pontuacao: melhorPontuacao, caminho: melhorCaminho, todosCaminhos: todosCaminhosLocais};
            }
        }

        
        function verificarVencedorTabuleiro(tabuleiro) {
            const padroesVitoria = [
                [0, 1, 2], [3, 4, 5], [6, 7, 8],
                [0, 3, 6], [1, 4, 7], [2, 5, 8],
                [0, 4, 8], [2, 4, 6]
            ];

            for (const padrao of padroesVitoria) {
                const [a, b, c] = padrao;
                if (tabuleiro[a] && tabuleiro[a] === tabuleiro[b] && tabuleiro[a] === tabuleiro[c]) {
                    return tabuleiro[a];
                }
            }
            return null;
        }

        function tabuleiroCheioTabuleiro(tabuleiro) {
            return tabuleiro.every(celula => celula !== '');
        }

        
        function avaliarTabuleiro(tabuleiro) {
            const vencedor = verificarVencedorTabuleiro(tabuleiro);
            if (vencedor === 'O') return 1;
            if (vencedor === 'X') return -1;
            if (tabuleiroCheioTabuleiro(tabuleiro)) return 0;
            
            let pontuacao = 0;
            const linhas = [
                [0,1,2], [3,4,5], [6,7,8],
                [0,3,6], [1,4,7], [2,5,8],
                [0,4,8], [2,4,6]
            ];
            
            for (const linha of linhas) {
                const [a, b, c] = linha;
                const valores = [tabuleiro[a], tabuleiro[b], tabuleiro[c]];
                const contagemO = valores.filter(v => v === 'O').length;
                const contagemX = valores.filter(v => v === 'X').length;
                
                if (contagemO === 2 && contagemX === 0) pontuacao += 0.3;
                if (contagemX === 2 && contagemO === 0) pontuacao -= 0.3;
            }
            
            return Math.max(-1, Math.min(1, pontuacao));
        }

        
        function gerarArvore(tabuleiro, jogador, profundidade, caminho = []) {
            if (profundidade >= profundidadeMaxima) {
                return {
                    tabuleiro: [...tabuleiro],
                    jogador: jogador,
                    profundidade: profundidade,
                    pontuacao: avaliarTabuleiro(tabuleiro),
                    filhos: [],
                    caminho: [...caminho],
                    ehSelecionado: caminhoSelecionado.slice(0, profundidade).every((jogada, idx) => caminho[idx] === jogada),
                    estaAnalisando: caminhoAnalisando.slice(0, profundidade).every((jogada, idx) => caminho[idx] === jogada) && 
                                 profundidade <= passoAnimacaoCaminho,
                    ehExplorado: todosCaminhos.some(p => 
                        p.caminho && p.caminho.slice(0, profundidade).every((jogada, idx) => caminho[idx] === jogada) && p.explorado
                    ),
                    ehFaltante: todosCaminhos.some(p => 
                        p.caminho && p.caminho.slice(0, profundidade).every((jogada, idx) => caminho[idx] === jogada) && !p.explorado
                    )
                };
            }
            
            const vencedor = verificarVencedorTabuleiro(tabuleiro);
            if (vencedor || tabuleiroCheioTabuleiro(tabuleiro)) {
                return {
                    tabuleiro: [...tabuleiro],
                    jogador: jogador,
                    profundidade: profundidade,
                    pontuacao: avaliarTabuleiro(tabuleiro),
                    filhos: [],
                    caminho: [...caminho],
                    ehSelecionado: caminhoSelecionado.slice(0, profundidade).every((jogada, idx) => caminho[idx] === jogada),
                    estaAnalisando: caminhoAnalisando.slice(0, profundidade).every((jogada, idx) => caminho[idx] === jogada) && 
                                 profundidade <= passoAnimacaoCaminho,
                    ehExplorado: todosCaminhos.some(p => 
                        p.caminho && p.caminho.slice(0, profundidade).every((jogada, idx) => caminho[idx] === jogada) && p.explorado
                    ),
                    ehFaltante: todosCaminhos.some(p => 
                        p.caminho && p.caminho.slice(0, profundidade).every((jogada, idx) => caminho[idx] === jogada) && !p.explorado
                    )
                };
            }
            
            const no = {
                tabuleiro: [...tabuleiro],
                jogador: jogador,
                profundidade: profundidade,
                pontuacao: null,
                filhos: [],
                caminho: [...caminho],
                ehSelecionado: caminhoSelecionado.slice(0, profundidade).every((jogada, idx) => caminho[idx] === jogada),
                estaAnalisando: caminhoAnalisando.slice(0, profundidade).every((jogada, idx) => caminho[idx] === jogada) && 
                             profundidade <= passoAnimacaoCaminho,
                ehExplorado: todosCaminhos.some(p => 
                    p.caminho && p.caminho.slice(0, profundidade).every((jogada, idx) => caminho[idx] === jogada) && p.explorado
                ),
                ehFaltante: todosCaminhos.some(p => 
                    p.caminho && p.caminho.slice(0, profundidade).every((jogada, idx) => caminho[idx] === jogada) && !p.explorado
                )
            };
            
            let jogadas = [];
            
            if (profundidade === 0) {
                jogadas = [0, 1, 2, 3, 4, 5, 6, 7, 8].filter(i => tabuleiro[i] === '');
                
                const jogadasDeCaminhos = new Set();
                todosCaminhos.forEach(p => {
                    if (p.caminho && p.caminho.length > 0) {
                        jogadasDeCaminhos.add(p.caminho[0]);
                    }
                });
                
                jogadas = [...new Set([...jogadas, ...Array.from(jogadasDeCaminhos)])];
                
                const ordemJogadas = [4, 0, 2, 6, 8, 1, 3, 5, 7];
                jogadas.sort((a, b) => ordemJogadas.indexOf(a) - ordemJogadas.indexOf(b));
            } else {
                jogadas = obterJogadasRelevantes(tabuleiro);
                
                const jogadasDeCaminhos = new Set();
                todosCaminhos.forEach(p => {
                    if (p.caminho && p.caminho.length > profundidade) {
                        let corresponde = true;
                        for (let i = 0; i < profundidade; i++) {
                            if (p.caminho[i] !== caminho[i]) {
                                corresponde = false;
                                break;
                            }
                        }
                        if (corresponde && p.caminho[profundidade] !== undefined) {
                            jogadasDeCaminhos.add(p.caminho[profundidade]);
                        }
                    }
                });
                
                jogadas = [...new Set([...jogadas, ...Array.from(jogadasDeCaminhos)])];
            }
            
            for (const jogada of jogadas) {
                if (tabuleiro[jogada] === '') {
                    const novoTabuleiro = [...tabuleiro];
                    novoTabuleiro[jogada] = jogador;
                    const noFilho = gerarArvore(
                        novoTabuleiro, 
                        jogador === 'X' ? 'O' : 'X', 
                        profundidade + 1,
                        [...caminho, jogada]
                    );
                    noFilho.jogada = jogada;
                    
                    const infoCaminho = todosCaminhos.find(p => 
                        p.caminho && p.caminho.slice(0, profundidade + 1).every((jogada, idx) => 
                            (idx < caminho.length ? caminho[idx] === jogada : true) && 
                            (idx === profundidade ? jogada === noFilho.jogada : true)
                        )
                    );
                    
                    if (infoCaminho) {
                        noFilho.ehExplorado = infoCaminho.explorado;
                        noFilho.ehFaltante = !infoCaminho.explorado;
                    }
                    
                    no.filhos.push(noFilho);
                }
            }
            
            if (no.filhos.length > 0) {
                const pontuacoes = no.filhos.map(filho => filho.pontuacao).filter(p => p !== null);
                if (pontuacoes.length > 0) {
                    no.pontuacao = jogador === 'O' ? Math.max(...pontuacoes) : Math.min(...pontuacoes);
                }
            }
            
            return no;
        }

        
        function obterJogadasRelevantes(tabuleiro) {
            const jogadas = [];
            const ordemJogadas = [4, 0, 2, 6, 8, 1, 3, 5, 7];
            
            for (let i = 0; i < 9; i++) {
                if (tabuleiro[i] === '') {
                    tabuleiro[i] = 'O';
                    if (verificarVencedorTabuleiro(tabuleiro) === 'O') {
                        jogadas.unshift(i);
                    }
                    tabuleiro[i] = 'X';
                    if (verificarVencedorTabuleiro(tabuleiro) === 'X') {
                        jogadas.unshift(i);
                    }
                    tabuleiro[i] = '';
                }
            }
            
            for (const jogada of ordemJogadas) {
                if (tabuleiro[jogada] === '' && !jogadas.includes(jogada)) {
                    jogadas.push(jogada);
                }
            }
            
            return jogadas.length > 0 ? jogadas : [0, 1, 2, 3, 4, 5, 6, 7, 8].filter(i => tabuleiro[i] === '');
        }

        
        function calcularDimensoesArvore(no) {
            let larguraMaxima = 0;
            let profundidadeMaxima = 0;
            
            function percorrer(n, profundidade, x) {
                profundidadeMaxima = Math.max(profundidadeMaxima, profundidade);
                larguraMaxima = Math.max(larguraMaxima, Math.abs(x));
                
                if (n.filhos && n.filhos.length > 0) {
                    const espacamento = 350; 
                    const quantidadeFilhos = n.filhos.length;
                    const inicioX = x - (espacamento * (quantidadeFilhos - 1)) / 2;
                    
                    for (let i = 0; i < quantidadeFilhos; i++) {
                        const filhoX = inicioX + i * espacamento;
                        percorrer(n.filhos[i], profundidade + 1, filhoX);
                    }
                }
            }
            
            percorrer(no, 0, 0);
            
            return {
                largura: (larguraMaxima * 2) + 800, 
                altura: (profundidadeMaxima * 150) + 300 
            };
        }

        
        function atualizarExibicaoArvore() {
            const tempoInicio = performance.now();
            dadosArvore = gerarArvore(tabuleiroJogo, jogadorAtual, 0, []);
            const tempoFim = performance.now();
            
            const estatisticas = calcularEstatisticasArvore(dadosArvore);
            elementoTotalNos.textContent = estatisticas.totalNos;
            elementoProfundidadeArvore.textContent = estatisticas.profundidadeMaxima;
            elementoFatorRamificacao.textContent = estatisticas.mediaRamificacao.toFixed(1);
            
            const dimensoes = calcularDimensoesArvore(dadosArvore);
            larguraArvore = Math.max(larguraCanvasBase, dimensoes.largura);
            alturaArvore = Math.max(alturaCanvasBase, dimensoes.altura);
            
            canvasArvore.width = larguraArvore * nivelZoom;
            canvasArvore.height = alturaArvore * nivelZoom;
            
            desenharArvore();
            
            if (!estaMostrandoCaminho) {
                elementoTempoAvaliacao.textContent = Math.round(tempoFim - tempoInicio) + 'ms';
            }
        }

        
        function calcularEstatisticasArvore(no) {
            let totalNos = 1;
            let profundidadeMaxima = no.profundidade;
            let totalFilhos = no.filhos.length;
            
            function percorrer(n) {
                totalNos++;
                profundidadeMaxima = Math.max(profundidadeMaxima, n.profundidade);
                totalFilhos += n.filhos.length;
                
                for (const filho of n.filhos) {
                    percorrer(filho);
                }
            }
            
            for (const filho of no.filhos) {
                percorrer(filho);
            }
            
            const mediaRamificacao = totalNos > 1 ? (totalFilhos / (totalNos - 1)) : 0;
            
            return {
                totalNos,
                profundidadeMaxima,
                mediaRamificacao
            };
        }

        
        function desenharArvore() {
            if (!dadosArvore) return;
            
            contexto.clearRect(0, 0, canvasArvore.width, canvasArvore.height);
            
            contexto.save();
            contexto.scale(nivelZoom, nivelZoom);
            contexto.translate(deslocamentoX, deslocamentoY);
            
            desenharNoArvore(dadosArvore, larguraArvore/2, 80, 350); 
            
            contexto.restore();
        }

        
      function desenharNoArvore(no, x, y, dx) {
            if (!no) return;
            
            contexto.save();
            
            let corPreenchimento, corBorda, raioNo = 20;
            
            if (no.estaAnalisando && estaMostrandoCaminho) {
                corPreenchimento = 'rgba(241, 196, 15, 0.4)';
                corBorda = '#f1c40f';
                raioNo = 22;
            } else if (no.ehSelecionado && caminhoSelecionado.length > 0) {
                corPreenchimento = 'rgba(155, 89, 182, 0.4)';
                corBorda = '#9b59b6';
                raioNo = 22;
            } else if (JSON.stringify(no.tabuleiro) === JSON.stringify(tabuleiroJogo)) {
                corPreenchimento = 'rgba(40, 167, 69, 0.4)';
                corBorda = '#28a745';
                raioNo = 22;
            } else if (no.ehExplorado && todosCaminhos.length > 0) {
                corPreenchimento = 'rgba(52, 152, 219, 0.3)';
                corBorda = '#3498db';
                raioNo = 20;
            } else if (no.ehFaltante && nosFaltantes.length > 0) {
                corPreenchimento = 'rgba(108, 117, 125, 0.2)';
                corBorda = '#6c757d';
                raioNo = 18;
            } else {
                corPreenchimento = no.jogador === 'O' ? 
                    'rgba(37, 117, 252, 0.15)' : 
                    'rgba(220, 53, 69, 0.15)';
                corBorda = no.jogador === 'O' ? '#2575fc' : '#dc3545';
                raioNo = 18;
            }
            
            
            contexto.fillStyle = corPreenchimento;
            contexto.strokeStyle = corBorda;
            contexto.lineWidth = 2;
            contexto.beginPath();
            contexto.arc(x, y, raioNo, 0, Math.PI * 2);
            contexto.fill();
            contexto.stroke();
            
            
            desenharMiniTabuleiro(no.tabuleiro, x - 12, y - 12, 24);
            
            
            contexto.fillStyle = '#212529';
            contexto.font = 'bold 10px Arial';
            contexto.textAlign = 'center';
            contexto.textBaseline = 'middle';
            const textoPontuacao = no.pontuacao !== null ? no.pontuacao.toFixed(1) : '?';
            contexto.fillText(textoPontuacao, x, y + raioNo + 15);
            
            contexto.restore();
            
            
            if (no.filhos && no.filhos.length > 0 && no.profundidade < profundidadeMaxima) {
                const quantidadeFilhos = no.filhos.length;
                const espacamento = dx;
                const inicioX = x - (espacamento * (quantidadeFilhos - 1)) / 2;
                
                
                contexto.save();
                contexto.lineWidth = 1.5;
                
                for (let i = 0; i < quantidadeFilhos; i++) {
                    const filho = no.filhos[i];
                    const filhoX = inicioX + i * espacamento;
                    const filhoY = y + 120;
                    
                    
                    if (filho.estaAnalisando && estaMostrandoCaminho) {
                        contexto.strokeStyle = 'rgba(241, 196, 15, 0.8)';
                        contexto.lineWidth = 2.5;
                    } else if (filho.ehSelecionado && caminhoSelecionado.length > 0) {
                        contexto.strokeStyle = 'rgba(155, 89, 182, 0.8)';
                        contexto.lineWidth = 2.5;
                    } else if (filho.ehExplorado && todosCaminhos.length > 0) {
                        contexto.strokeStyle = 'rgba(52, 152, 219, 0.5)';
                        contexto.lineWidth = 2;
                    } else if (filho.ehFaltante && nosFaltantes.length > 0) {
                        contexto.strokeStyle = 'rgba(108, 117, 125, 0.3)';
                        contexto.lineWidth = 1.5;
                    } else {
                        contexto.strokeStyle = 'rgba(108, 117, 125, 0.2)';
                        contexto.lineWidth = 1.5;
                    }

                    contexto.beginPath();
                    contexto.moveTo(x, y + raioNo);
                    contexto.lineTo(filhoX, filhoY - 15);
                    contexto.stroke();
                }
                contexto.restore();
                
                
                for (let i = 0; i < quantidadeFilhos; i++) {
                    const filhoX = inicioX + i * espacamento;
                    const filhoY = y + 120;
                    desenharNoArvore(no.filhos[i], filhoX, filhoY, espacamento / 1.8);
                }
            }
        }

        
        function desenharMiniTabuleiro(tabuleiro, x, y, tamanho) {
            const tamanhoCelula = tamanho / 3;
            const padding = 1;
            
            
            contexto.strokeStyle = '#adb5bd';
            contexto.lineWidth = 0.8; 
            contexto.strokeRect(x, y, tamanho, tamanho);
            
            
            for (let linha = 0; linha < 3; linha++) {
                for (let coluna = 0; coluna < 3; coluna++) {
                    const celulaX = x + coluna * tamanhoCelula;
                    const celulaY = y + linha * tamanhoCelula;
                    const indice = linha * 3 + coluna;
                    
                    
                    contexto.fillStyle = '#ffffff';
                    contexto.fillRect(celulaX + padding, celulaY + padding, tamanhoCelula - 2*padding, tamanhoCelula - 2*padding);
                    
                    
                    if (tabuleiro[indice] !== '') {
                        contexto.fillStyle = tabuleiro[indice] === 'O' ? '#2575fc' : '#dc3545';
                        contexto.font = 'bold 9px Arial'; 
                        contexto.textAlign = 'center';
                        contexto.textBaseline = 'middle';
                        contexto.fillText(tabuleiro[indice], celulaX + tamanhoCelula/2, celulaY + tamanhoCelula/2);
                    }
                }
            }
        }

        
        function aumentarZoom() {
            if (nivelZoom < ZOOM_MAXIMO) {
                nivelZoom += PASSO_ZOOM;
                atualizarExibicaoZoom();
                atualizarExibicaoArvore();
            }
        }

        function diminuirZoom() {
            if (nivelZoom > ZOOM_MINIMO) {
                nivelZoom -= PASSO_ZOOM;
                atualizarExibicaoZoom();
                atualizarExibicaoArvore();
            }
        }

        function atualizarExibicaoZoom() {
            elementoNivelZoom.textContent = `${Math.round(nivelZoom * 100)}%`;
        }

        
        controleProfundidade.addEventListener('input', function() {
            profundidadeMaxima = parseInt(this.value);
            valorProfundidade.textContent = profundidadeMaxima;
            atualizarExibicaoArvore();
        });

    

        
        function reiniciarJogo() {
            tabuleiroJogo = ['', '', '', '', '', '', '', '', ''];
            jogadorAtual = 'X';
            jogoAtivo = true;
            historicoJogadas = [];
            caminhoSelecionado = [];
            caminhoAnalisando = [];
            todosCaminhos = [];
            nosFaltantes = [];
            estaMostrandoCaminho = false;
            deslocamentoX = 0;
            deslocamentoY = 0;
            nivelZoom = 1.0;
            atualizarExibicaoZoom();
            
            const celulas = document.querySelectorAll('.celula');
            celulas.forEach(celula => {
                celula.textContent = '';
                celula.classList.remove('x', 'o', 'vencedora');
            });
            
            atualizarStatusJogo();
            atualizarExibicaoArvore();
            esconderAtrasoIA();
            
            atualizarExibicaoCaminho([]);
            elementoExplicacaoCaminho.textContent = '';
            elementoCaminhoSelecionado.textContent = 'Aguardando análise...';
            
            if (!jogadorEhX) {
                mostrarAtrasoIA();
                setTimeout(() => {
                    analisarEMostrarCaminho().then(() => {
                        setTimeout(fazerJogadaIA, 1000);
                    });
                }, 500);
            }
        }

        
        inicializarTabuleiro();
        atualizarPlacares();
        atualizarExibicaoZoom();

        
        window.addEventListener('resize', () => {
            setTimeout(() => {
                desenharArvore();
            }, 100);
        });

        
        const containerArvore = document.querySelector('.container-arvore');
        let estaArrastando = false;
        let ultimoX = 0;
        let ultimoY = 0;

        containerArvore.addEventListener('mousedown', (e) => {
            estaArrastando = true;
            ultimoX = e.clientX - containerArvore.offsetLeft;
            ultimoY = e.clientY - containerArvore.offsetTop;
            containerArvore.style.cursor = 'grabbing';
        });

        containerArvore.addEventListener('mousemove', (e) => {
            if (!estaArrastando) return;
            
            const xAtual = e.clientX - containerArvore.offsetLeft;
            const yAtual = e.clientY - containerArvore.offsetTop;
            
            const deltaX = xAtual - ultimoX;
            const deltaY = yAtual - ultimoY;
            
            deslocamentoX += deltaX / nivelZoom;
            deslocamentoY += deltaY / nivelZoom;
            
            deslocamentoX = Math.max(-larguraArvore + (containerArvore.clientWidth / nivelZoom), Math.min(0, deslocamentoX));
            deslocamentoY = Math.max(-alturaArvore + (containerArvore.clientHeight / nivelZoom), Math.min(0, deslocamentoY));
            
            ultimoX = xAtual;
            ultimoY = yAtual;
            
            desenharArvore();
        });

        document.addEventListener('mouseup', () => {
            estaArrastando = false;
            containerArvore.style.cursor = 'default';
        });

        containerArvore.addEventListener('wheel', (e) => {
            e.preventDefault();
            
            const xAntigo = e.clientX - containerArvore.offsetLeft;
            const yAntigo = e.clientY - containerArvore.offsetTop;
            
            if (e.ctrlKey || e.metaKey) {
                const mudancaEscala = e.deltaY > 0 ? 1 - PASSO_ZOOM : 1 + PASSO_ZOOM;
                const novoZoom = nivelZoom * mudancaEscala;
                
                if (novoZoom >= ZOOM_MINIMO && novoZoom <= ZOOM_MAXIMO) {
                    deslocamentoX = xAntigo/nivelZoom - (xAntigo/nivelZoom - deslocamentoX) * mudancaEscala;
                    deslocamentoY = yAntigo/nivelZoom - (yAntigo/nivelZoom - deslocamentoY) * mudancaEscala;
                    
                    nivelZoom = novoZoom;
                    atualizarExibicaoZoom();
                    atualizarExibicaoArvore();
                }
            } else {
                deslocamentoX += e.deltaX * 0.5;
                deslocamentoY += e.deltaY * 0.5;
                
                deslocamentoX = Math.max(-larguraArvore + (containerArvore.clientWidth / nivelZoom), Math.min(0, deslocamentoX));
                deslocamentoY = Math.max(-alturaArvore + (containerArvore.clientHeight / nivelZoom), Math.min(0, deslocamentoY));
                
                desenharArvore();
            }
        });
        
        window.addEventListener('load', () => {
            setTimeout(() => {
                atualizarExibicaoArvore();
            }, 200);
        });
