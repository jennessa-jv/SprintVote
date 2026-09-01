function PlayerList({
    players,
    revealed,
    votes
}) {

    return (
        <div className="players">

            <h2>
                Players
            </h2>


            {players.map(player => (

                <div
                    className="player"
                    key={player.user_id}
                >

                    <span>

                        {player.name}

                        {player.is_moderator && (
                            <strong>
                                {" "}👑 Moderator
                            </strong>
                        )}

                    </span>


                    <span>

                        {revealed

                            ? (
                                votes[
                                    player.user_id
                                ] || "-"
                            )

                            : (
                                player.voted
                                    ? "✓ Voted"
                                    : "Waiting"
                            )

                        }

                    </span>

                </div>

            ))}

        </div>
    );
}


export default PlayerList;