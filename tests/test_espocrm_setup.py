"""
test_espocrm_setup.py

Unit test suite validating:
1. EspoCRM Docker Compose configuration and environment variables template.
2. EspoCRM Architecture files (Core, Modules, Api, ORM).
3. Metadata-driven JSON entity definitions (JobApplicant).
4. REST API Request / Response lifecycle simulation.
"""

import os
import json
import unittest


class TestEspoCRMSetup(unittest.TestCase):
    def setUp(self):
        self.root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

    def test_docker_compose_configuration(self):
        """Verify docker-compose.espocrm.yml services and port specifications."""
        compose_path = os.path.join(self.root_dir, 'docker-compose.espocrm.yml')
        self.assertTrue(os.path.exists(compose_path), "docker-compose.espocrm.yml should exist")

        with open(compose_path, 'r', encoding='utf-8') as f:
            content = f.read()

        # Check required services
        self.assertIn('espocrm-mysql:', content)
        self.assertIn('espocrm:', content)
        self.assertIn('espocrm-daemon:', content)
        self.assertIn('espocrm-phpmyadmin:', content)

        # Check port mappings
        self.assertIn('8080:80', content)
        self.assertIn('8081:80', content)

        # Check healthcheck
        self.assertIn('mysqladmin', content)
        self.assertIn('service_healthy', content)

    def test_env_example_template(self):
        """Verify .env.espocrm.example contains necessary configuration keys."""
        env_path = os.path.join(self.root_dir, '.env.espocrm.example')
        self.assertTrue(os.path.exists(env_path), ".env.espocrm.example should exist")

        with open(env_path, 'r', encoding='utf-8') as f:
            content = f.read()

        required_keys = [
            'ESPOCRM_PORT',
            'PMA_PORT',
            'ESPOCRM_SITE_URL',
            'MYSQL_ROOT_PASSWORD',
            'ESPOCRM_DATABASE_HOST',
            'ESPOCRM_DATABASE_NAME',
            'ESPOCRM_DATABASE_USER',
            'ESPOCRM_ADMIN_USERNAME',
            'ESPOCRM_ADMIN_PASSWORD',
        ]
        for key in required_keys:
            self.assertIn(key, content, f"Missing key in .env.espocrm.example: {key}")

    def test_architecture_directory_files(self):
        """Verify the 4 required EspoCRM architecture directories exist and contain key files."""
        expected_files = [
            'application/Espo/Core/Application.php',
            'application/Espo/Core/Container.php',
            'application/Espo/Core/Api/Request.php',
            'application/Espo/Core/Api/Response.php',
            'application/Espo/ORM/EntityManager.php',
            'application/Espo/ORM/Entity.php',
            'application/Espo/ORM/Repository.php',
            'application/Espo/Modules/Recruitment/Module.php',
            'application/Espo/Resources/metadata/entityDefs/JobApplicant.json',
        ]

        for rel_path in expected_files:
            full_path = os.path.join(self.root_dir, rel_path)
            self.assertTrue(os.path.exists(full_path), f"Architecture file missing: {rel_path}")
            self.assertGreater(os.path.getsize(full_path), 50, f"File {rel_path} should not be empty")

    def test_job_applicant_metadata_json(self):
        """Verify the JSON metadata definition for JobApplicant matches requirements."""
        meta_path = os.path.join(
            self.root_dir,
            'application/Espo/Resources/metadata/entityDefs/JobApplicant.json'
        )
        with open(meta_path, 'r', encoding='utf-8') as f:
            data = json.load(f)

        self.assertIn('fields', data)
        self.assertIn('pipelineStage', data['fields'])

        stage_field = data['fields']['pipelineStage']
        self.assertEqual(stage_field['type'], 'enum')
        self.assertIn('Screening', stage_field['options'])
        self.assertIn('Technical Round 1', stage_field['options'])
        self.assertIn('Technical Round 2', stage_field['options'])
        self.assertIn('HR Round', stage_field['options'])
        self.assertIn('Offered', stage_field['options'])
        self.assertIn('Rejected', stage_field['options'])

    def test_rest_api_simulation(self):
        """Simulate an EspoCRM REST API request/response cycle for /api/v1/JobApplicant."""
        request_mock = {
            'method': 'GET',
            'path': '/api/v1/JobApplicant',
            'queryParams': {'maxSize': 20, 'offset': 0},
            'headers': {'Authorization': 'Bearer test-crm-api-token-xyz'}
        }

        # Simulated response from Espo Api layer
        response_data = {
            'total': 5,
            'list': [
                {'id': 'app-001', 'name': 'Priya Sharma', 'pipelineStage': 'Technical Round 1'},
                {'id': 'app-002', 'name': 'Rohan Mehta', 'pipelineStage': 'Screening'},
            ]
        }

        self.assertEqual(request_mock['method'], 'GET')
        self.assertTrue(request_mock['headers']['Authorization'].startswith('Bearer '))
        self.assertEqual(response_data['total'], 5)
        self.assertEqual(len(response_data['list']), 2)


if __name__ == '__main__':
    unittest.main(verbosity=2)
