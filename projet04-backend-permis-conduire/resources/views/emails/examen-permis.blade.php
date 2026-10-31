<!DOCTYPE html>
<html lang="fr">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Planning Hebdomadaire</title>
    <style>
        /* Styles de base */
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Segoe UI', Arial, sans-serif;
            background-color: #f8f9fa;
            padding: 20px;
        }

        .table-container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
            overflow: hidden;
        }

        /* En-tête du tableau */
        .table-header {
            background: linear-gradient(135deg, #4285f4, #34a853);
            color: white;
            padding: 20px;
            text-align: center;
        }

        .table-title {
            font-size: 24px;
            font-weight: 600;
            margin-bottom: 5px;
        }

        .table-subtitle {
            font-size: 14px;
            opacity: 0.9;
        }

        /* Tableau */
        .planning-table {
            width: 100%;
            border-collapse: collapse;
            background: white;
        }

        .planning-table th {
            background: #f8f9fa;
            color: #333;
            font-weight: 600;
            padding: 15px 12px;
            text-align: left;
            border-bottom: 2px solid #e9ecef;
            font-size: 14px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .planning-table td {
            padding: 15px 12px;
            border-bottom: 1px solid #e9ecef;
            vertical-align: top;
            font-size: 14px;
        }

        .planning-table tr:hover {
            background-color: #f8f9fa;
        }

        /* Colonnes spécifiques */
        .day-column {
            font-weight: 600;
            color: #4285f4;
            width: 12%;
        }

        .time-column {
            color: #666;
            width: 15%;
            font-size: 13px;
        }

        .activity-column {
            width: 25%;
        }

        .status-column {
            width: 10%;
            text-align: center;
        }

        .progress-column {
            width: 20%;
        }

        .actions-column {
            width: 18%;
            text-align: center;
        }

        /* Badges et statuts */
        .status-badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 500;
        }

        .status-completed {
            background: #e7f4e4;
            color: #34a853;
        }

        .status-pending {
            background: #fff8e1;
            color: #f9a825;
        }

        .status-inprogress {
            background: #e8f0fe;
            color: #4285f4;
        }

        /* Barre de progression */
        .progress-bar {
            width: 100%;
            height: 6px;
            background: #e9ecef;
            border-radius: 3px;
            overflow: hidden;
        }

        .progress-fill {
            height: 100%;
            border-radius: 3px;
            transition: width 0.3s ease;
        }

        .progress-100 {
            background: #34a853;
            width: 100%;
        }

        .progress-75 {
            background: #4285f4;
            width: 75%;
        }

        .progress-50 {
            background: #f9a825;
            width: 50%;
        }

        .progress-25 {
            background: #ea4335;
            width: 25%;
        }

        /* Actions */
        .action-button {
            background: #4285f4;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 5px;
            cursor: pointer;
            font-size: 12px;
            font-weight: 500;
            transition: all 0.3s ease;
        }

        .action-button:hover {
            background: #3367d6;
            transform: translateY(-1px);
        }

        .action-dropdown {
            position: relative;
            display: inline-block;
        }

        .dropdown-content {
            display: none;
            position: absolute;
            background: white;
            min-width: 160px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
            border-radius: 5px;
            z-index: 1;
            right: 0;
        }

        .dropdown-content a {
            color: #333;
            padding: 10px 15px;
            text-decoration: none;
            display: block;
            font-size: 13px;
            border-bottom: 1px solid #f0f0f0;
        }

        .dropdown-content a:hover {
            background: #f8f9fa;
        }

        .action-dropdown:hover .dropdown-content {
            display: block;
        }

        /* Indicateurs visuels */
        .priority-high::before {
            content: "🔴";
            margin-right: 5px;
        }

        .priority-medium::before {
            content: "🟡";
            margin-right: 5px;
        }

        .priority-low::before {
            content: "🟢";
            margin-right: 5px;
        }

        /* Responsive */
        @media (max-width: 768px) {
            .table-container {
                border-radius: 0;
                margin: 0 -20px;
            }

            .planning-table {
                font-size: 12px;
            }

            .planning-table th,
            .planning-table td {
                padding: 10px 8px;
            }
        }
    </style>
</head>

<body>
    <div class="table-container">

        <div class="table-header">
            <div class="table-title">Periode d'examen du permis de conduire</div>

        </div>
        <!-- Contenu principal -->
        <div class="content">
            <div class="greeting">
               Bonjour @if(isset($data['name']) && !empty(trim($data['name']))){{ $data['name'] }}
                @endif
            </div>

            <div class="section">
                <p> {{ $data['message'] }} </p>
            </div>
        </div>
    </div>
    <!-- Pied de page -->
    <div class="footer">
        <div class="team-signature">L'équipe Auto Ecole</div>


        <div class="legal">
            <p>© 2025 Auto Ecole. Tous droits réservés.</p>
           
        </div>
    </div>
</body>

</html>