"""add evaluation pipeline_stage and scores

Revision ID: b5a67c8d9e01
Revises: 294fea9f5bdd
Create Date: 2026-09-13 19:59:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = 'b5a67c8d9e01'
down_revision: Union[str, Sequence[str], None] = '294fea9f5bdd'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    # Users table
    op.add_column('users', sa.Column('is_active', sa.Boolean(), nullable=True, server_default='true'))

    # Jobs table
    op.add_column('jobs', sa.Column('assigned_recruiter_id', sa.String(length=36), nullable=True))
    op.add_column('jobs', sa.Column('requirements_version', sa.Integer(), nullable=True, server_default='1'))
    op.add_column('jobs', sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True))

    # Candidates table
    op.add_column('candidates', sa.Column('original_filename', sa.String(length=512), nullable=True, server_default=''))
    op.add_column('candidates', sa.Column('stored_filename', sa.String(length=512), nullable=True, server_default=''))
    op.add_column('candidates', sa.Column('email', sa.String(length=255), nullable=True))
    op.add_column('candidates', sa.Column('name_extraction_status', sa.String(length=50), nullable=True, server_default='extracted'))
    op.add_column('candidates', sa.Column('scored_under_requirements_version', sa.Integer(), nullable=True, server_default='1'))
    op.add_column('candidates', sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True))

    # Evaluations table
    op.add_column('evaluations', sa.Column('job_id', sa.String(length=36), nullable=True))
    op.add_column('evaluations', sa.Column('final_score', sa.Float(), nullable=True))
    op.add_column('evaluations', sa.Column('mandatory_score', sa.Float(), nullable=True))
    op.add_column('evaluations', sa.Column('experience_score', sa.Float(), nullable=True))
    op.add_column('evaluations', sa.Column('education_score', sa.Float(), nullable=True))
    op.add_column('evaluations', sa.Column('preferred_score', sa.Float(), nullable=True))
    op.add_column('evaluations', sa.Column('cert_score', sa.Float(), nullable=True))
    op.add_column('evaluations', sa.Column('explanation', sa.Text(), nullable=True))
    op.add_column('evaluations', sa.Column('strengths_json', sa.JSON(), nullable=True))
    op.add_column('evaluations', sa.Column('gaps_json', sa.JSON(), nullable=True))
    op.add_column('evaluations', sa.Column('approval_status', sa.String(length=50), nullable=True, server_default='pending'))
    op.add_column('evaluations', sa.Column('approved_by', sa.String(length=36), nullable=True))
    op.add_column('evaluations', sa.Column('approved_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('evaluations', sa.Column('rejection_note', sa.Text(), nullable=True))
    op.add_column('evaluations', sa.Column('stage', sa.String(length=50), nullable=True, server_default='screened'))
    op.add_column('evaluations', sa.Column('pipeline_stage', sa.String(length=50), nullable=True, server_default='SCREENED'))

def downgrade() -> None:
    pass
