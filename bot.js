const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, Events } = require('discord.js');
const mysql = require('mysql2');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'tavares_liberation',
    port: 3306
});

db.connect((err) => {
    if (err) {
        console.error('❌ Erro ao conectar ao MySQL:', err);
        return;
    }
    console.log('✅ Conectado ao MySQL (XAMPP)');
});

client.once('ready', () => {
    console.log(`🤖 Bot ${client.user.tag} está online!`);
});

async function criarMensagemLiberacao() {
    const channel = client.channels.cache.get('1407962351269056525'); // SUBSTITUA pelo ID do canal
    
    if (!channel) {
        console.log('❌ Canal não encontrado!');
        return;
    }
    
    const embed = new EmbedBuilder()
        .setColor(0x0099FF)
        .setTitle('🔓 SISTEMA DE LIBERAÇÃO - MTA:SA')
        .setDescription('**Para se liberar no servidor, siga os passos:**\n\n1. 🎮 **Entre no servidor MTA**\n2. 📋 **Anote o ID que aparecerá na tela**\n3. 🔓 **Clique no botão abaixo**\n4. ⌨️ **Digite seu ID no pop-up**\n5. ✅ **Entre novamente no servidor!**')
        .addFields(
            { name: '📝 Como obter seu ID?', value: 'Ao tentar entrar no servidor, você será kickado e receberá uma mensagem com seu ID de liberação.' },
            { name: '❓ Problemas?', value: 'Contate um administrador.' }
        )
        .setFooter({ text: 'Sistema de Liberação - MTA:SA' });

    const button = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('liberar_conta')
                .setLabel('🔓 Liberar Minha Conta')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('🔓')
        );

    await channel.send({ 
        embeds: [embed], 
        components: [button] 
    });
    console.log('📝 Mensagem de liberação criada!');
}

client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isButton()) return;

    if (interaction.customId === 'liberar_conta') {
        const modal = new ModalBuilder()
            .setCustomId('modal_liberacao')
            .setTitle('🔓 Liberação - MTA:SA');

        const idInput = new TextInputBuilder()
            .setCustomId('id_liberacao')
            .setLabel("Digite seu ID de liberação:")
            .setStyle(TextInputStyle.Short)
            .setPlaceholder("Exemplo: 1000, 1001, 1002...")
            .setRequired(true)
            .setMinLength(4)
            .setMaxLength(6);

        const actionRow = new ActionRowBuilder().addComponents(idInput);
        modal.addComponents(actionRow);

        await interaction.showModal(modal);
    }
});

client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isModalSubmit()) return;

    if (interaction.customId === 'modal_liberacao') {
        const idLiberacao = interaction.fields.getTextInputValue('id_liberacao');
        const userId = interaction.user.id;
        const userName = interaction.user.tag;

        const idNumero = parseInt(idLiberacao);
        if (isNaN(idNumero) || idNumero < 1000) {
            const embedErro = new EmbedBuilder()
                .setColor(0xFF0000)
                .setTitle('❌ ID Inválido')
                .setDescription('O ID deve ser um número a partir de 1000!')
                .addFields(
                    { name: '📋 ID Digitado', value: `\`${idLiberacao}\`` },
                    { name: '💡 Dica', value: 'Digite apenas números (ex: 1000, 1001, etc.)' }
                );

            return await interaction.reply({ 
                embeds: [embedErro], 
                ephemeral: true 
            });
        }

        await interaction.deferReply({ ephemeral: true });

        db.execute('SELECT * FROM liberacoes WHERE id_liberacao = ?', [idNumero], async (err, results) => {
            if (err) {
                console.error('Erro na consulta:', err);
                const embedErro = new EmbedBuilder()
                    .setColor(0xFF0000)
                    .setTitle('❌ Erro Interno')
                    .setDescription('Ocorreu um erro ao processar sua solicitação.');

                return await interaction.editReply({ 
                    embeds: [embedErro] 
                });
            }

            if (results.length === 0) {
                const embedNaoEncontrado = new EmbedBuilder()
                    .setColor(0xFFA500)
                    .setTitle('🔍 ID Não Encontrado')
                    .setDescription(`ID **${idNumero}** não foi encontrado no sistema!`)
                    .addFields(
                        { name: '📋 Possíveis causas:', value: '• ID digitado incorretamente\n• Ainda não foi gerado no servidor\n• Não entrou no servidor ainda' },
                        { name: '💡 Solução:', value: '1. Entre no servidor MTA para gerar seu ID\n2. Verifique se digitou o ID corretamente\n3. Contate um administrador se o problema persistir' }
                    );

                return await interaction.editReply({ 
                    embeds: [embedNaoEncontrado] 
                });
            }

            const liberacao = results[0];
            const serial = liberacao.serial;

            if (liberacao.liberado === 1) {
                const embedJaLiberado = new EmbedBuilder()
                    .setColor(0x00FF00)
                    .setTitle('✅ Já Liberado')
                    .setDescription(`ID **${idNumero}** já está liberado!`)
                    .addFields(
                        { name: '📋 Status', value: '✅ **LIBERADO**' },
                        { name: '💡 Informação', value: 'Você já pode entrar no servidor MTA!' }
                    );

                return await interaction.editReply({ 
                    embeds: [embedJaLiberado] 
                });
            }

            db.execute('UPDATE liberacoes SET liberado = 1, data_liberacao = NOW() WHERE id_liberacao = ?', [idNumero], async (err, updateResults) => {
                if (err) {
                    console.error('Erro ao atualizar:', err);
                    const embedErro = new EmbedBuilder()
                        .setColor(0xFF0000)
                        .setTitle('❌ Erro na Liberação')
                        .setDescription('Ocorreu um erro ao liberar sua conta.');

                    return await interaction.editReply({ 
                        embeds: [embedErro] 
                    });
                }

                // Sucesso!
                const embedSucesso = new EmbedBuilder()
                    .setColor(0x00FF00)
                    .setTitle('✅ Liberação Concluída!')
                    .setDescription(`Sua conta foi liberada com sucesso!`)
                    .addFields(
                        { name: '📋 ID Liberado', value: `\`${idNumero}\``, inline: true },
                        { name: '👤 Discord', value: `\`${userName}\``, inline: true },
                        { name: '🔑 Serial', value: `\`${serial}\``, inline: true },
                        { name: '🕒 Data', value: new Date().toLocaleString('pt-BR'), inline: true },
                        { name: '🎮 Próximo Passo', value: '**Agora entre novamente no servidor MTA!**' }
                    )
                    .setFooter({ text: 'Bom jogo! 🎉', iconURL: interaction.user.displayAvatarURL() });

                await interaction.editReply({ 
                    embeds: [embedSucesso] 
                });

                console.log(`✅ Jogador ${idNumero} (Serial: ${serial}) liberado por ${userName}`);
            });
        });
    }
});

client.on('messageCreate', async message => {
    if (message.author.bot) return;

    if (message.content === '!criarliberacao' && message.member.permissions.has('Administrator')) {
        criarMensagemLiberacao();
        message.reply('✅ Mensagem de liberação criada!');
    }

    // Comando de verificação manual
    if (message.content.startsWith('!verificar')) {
        const args = message.content.split(' ');
        
        if (args.length < 2) {
            return message.reply('Use: `!verificar <ID>`');
        }

        const idLiberacao = parseInt(args[1]);

        if (isNaN(idLiberacao)) {
            return message.reply('❌ O ID deve ser um número!');
        }

        db.execute('SELECT * FROM liberacoes WHERE id_liberacao = ?', [idLiberacao], (err, results) => {
            if (err) {
                return message.reply('❌ Erro interno.');
            }

            if (results.length === 0) {
                return message.reply(`❌ ID **${idLiberacao}** não encontrado no sistema.`);
            }

            const liberacao = results[0];
            const status = liberacao.liberado ? '✅ LIBERADO' : '❌ PENDENTE';
            const cor = liberacao.liberado ? 0x00FF00 : 0xFFA500;

            const embed = new EmbedBuilder()
                .setColor(cor)
                .setTitle('📋 Status da Liberação')
                .addFields(
                    { name: 'ID', value: `\`${liberacao.id_liberacao}\``, inline: true },
                    { name: 'Status', value: status, inline: true },
                    { name: 'Serial', value: `\`${liberacao.serial}\``, inline: true },
                    { name: 'Data Criação', value: new Date(liberacao.data_criacao).toLocaleString('pt-BR'), inline: true }
                );

            if (liberacao.liberado && liberacao.data_liberacao) {
                embed.addFields({ 
                    name: 'Data Liberação', 
                    value: new Date(liberacao.data_liberacao).toLocaleString('pt-BR'), 
                    inline: true 
                });
            }

            message.reply({ embeds: [embed] });
        });
    }
});

client.login('PREENCHA_SEU_TOKEN_AQUI'); // ---> token do bot.
